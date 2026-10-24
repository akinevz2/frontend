import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import { descendantIds, flatten, lineage, type WindowNode } from "./model";
import { useRetained, type SignalManifest } from "@/lib/signals";

export type PermalinkMode = "hash" | "post";

export type WindowFlags = {
  expanded?: boolean;
  minimized?: boolean;
  closed?: boolean;
  maximized?: boolean;
};

type State = Record<string, WindowFlags>;
type Action =
  | { type: "patch"; ids: string[]; flags: WindowFlags }
  | { type: "restore"; ids: string[] };

function reducer(state: State, action: Action): State {
  const next = { ...state };
  for (const id of action.ids) {
    next[id] =
      action.type === "restore"
        ? { ...next[id], minimized: false, closed: false }
        : { ...next[id], ...action.flags };
  }
  return next;
}

type WindowStore = {
  windows: WindowNode[];
  permalinkMode: PermalinkMode;
  /** Replaces close/minimise of top-level windows (e.g. "go back"). */
  onLeave: (() => void) | undefined;
  /** Records the window in the URL so returning to the page reveals it. */
  remember: (id: string) => void;
  flagsOf: (id: string) => WindowFlags;
  patch: (id: string, flags: WindowFlags) => void;
  expand: (id: string) => void;
  /** Un-minimises and re-opens a window together with its ancestors. */
  restore: (id: string) => void;
  parked: WindowNode[];
};

const Ctx = createContext<WindowStore | null>(null);

/** Seeds the store synchronously from the URL: if the location names a
 * target window (?post=slug / #tree-index), it starts REVEALED — expanded
 * inline, never maximized — with its whole subtree expanded on the FIRST
 * render. Revealing inline needs every ancestor expanded too (a collapsed
 * parent never mounts the target, leaving nothing to scroll to), hence
 * the lineage. usePermalinkTarget's post-paint effect re-applies the
 * identical flags a frame later, and the pageSlide theme lands the page
 * on the element; seeding first keeps that first paint already expanded
 * instead of popping the section open after the fact. */
function initialFlags(roots: WindowNode[]): State {
  const windows = flatten(roots);
  const target = findTarget(windows);
  if (!target) return {};
  const state: State = {};
  for (const id of lineage(target.id)) {
    state[id] = { expanded: true, minimized: false };
  }
  for (const id of descendantIds(windows, target.id)) {
    state[id] = { expanded: true, minimized: false };
  }
  return state;
}

export function WindowProvider({
  roots,
  permalinkMode = "hash",
  onLeave,
  children,
}: {
  roots: WindowNode[];
  permalinkMode?: PermalinkMode;
  onLeave?: (() => void) | undefined;
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(reducer, [], () => initialFlags(roots));
  const windows = useMemo(() => flatten(roots), [roots]);

  const store = useMemo<WindowStore>(() => {
    const flagsOf = (id: string) => state[id] ?? {};
    return {
      windows,
      permalinkMode,
      onLeave,
      remember: (id) => {
        const node = windows.find((w) => w.id === id);
        if (node)
          history.replaceState(
            history.state,
            "",
            permalinkFor(node, permalinkMode),
          );
      },
      flagsOf,
      patch: (id, flags) => dispatch({ type: "patch", ids: [id], flags }),
      expand: (id) =>
        dispatch({
          type: "patch",
          ids: lineage(id),
          flags: { expanded: true },
        }),
      restore: (id) => dispatch({ type: "restore", ids: lineage(id) }),
      parked: windows.filter((w) => {
        return state[w.id]?.closed;
      }),
    };
  }, [state, windows, permalinkMode, onLeave]);

  // The parked-window roster is broadcast as a retained signal, not
  // held in a store: the publisher just DECLARES the snapshot it
  // currently holds — the library commits it post-render and restores
  // the seed on unmount — so Clippy's readers hold no state of their
  // own and this component manages no effect of its own. The snapshot
  // is memo'd on the store: a fresh object per flag change keeps the
  // refire frequency of the old whole-republish contract, and nothing
  // higher up the tree can disturb it.
  const roster = useMemo<SignalManifest["window:hidden"]>(
    () => ({
      items: store.parked.map((w) => ({ id: w.id, label: w.heading ?? w.id })),
      restore: store.restore,
    }),
    [store],
  );
  useRetained("window:hidden", roster);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useWindowStore(): WindowStore {
  const store = useContext(Ctx);
  if (!store) throw new Error("useWindowStore needs a WindowProvider");
  return store;
}

export const toSlug = (heading: string): string =>
  heading
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

/** Blog posts are addressed as ?post=slug, everything else by #tree-index.
 * The depth-0 root is excluded from ?post= addressing: findTarget's
 * slug lookup only dives under the root, so emitting the slug for it
 * generates a dead permalink from the very rail that shows the button. */
export function permalinkFor(node: WindowNode, mode: PermalinkMode): string {
  const { origin, pathname } = window.location;
  if (mode === "post" && node.depth > 0 && node.heading) {
    return `${origin}${pathname}?post=${encodeURIComponent(toSlug(node.heading))}`;
  }
  return `${origin}${pathname}#${node.id}`;
}

/** The window named by the URL. BOTH link shapes land on any page:
 * ?post=slug (the blog's permalink mode) addresses a post by heading, and
 * #tree-index addresses any window by id. ?post wins when both are set
 * (they could name different windows); the hash is the fallback. */
function findTarget(windows: WindowNode[]) {
  const slug = new URLSearchParams(location.search).get("post");
  if (slug) {
    const post = windows.find(
      (w) => w.depth > 0 && w.heading && toSlug(w.heading) === slug,
    );
    if (post) return post;
  }
  const hash = location.hash.slice(1);
  return windows.find((w) => w.id === hash);
}

/** Confirms the window named by the URL, once per page load. The store is
 * already seeded synchronously with the target revealed (initialFlags) so
 * the FIRST paint shows it expanded with no late pop-open; this effect
 * only re-applies the identical, idempotent patches. Both link shapes
 * arrive the same way: the target reveals inline with its whole subtree
 * expanded — returning from a link lands back on the section instead of
 * re-lifting it fullscreen. The landing scroll is no business of the
 * store: the pageSlide theme owns it (scrollToHash), like every other
 * hash choreography. */
export function usePermalinkTarget() {
  const { windows, expand, patch } = useWindowStore();
  useEffect(() => {
    const target = findTarget(windows);
    if (!target) return;
    expand(target.id);
    // Arriving at a permalink reveals the target's whole subtree, not
    // just its own section (descendants expand, stale minimized flags
    // clear; closed/parked windows stay parked). Nothing lifts and
    // nothing scrolls here — the pageSlide theme lands the page.
    for (const id of descendantIds(windows, target.id)) {
      patch(id, { expanded: true, minimized: false });
    }
  }, []);
}

/** Same-tab links out of the site remember the window they were clicked in. */
export function useRememberLeave() {
  const { remember } = useWindowStore();
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as Element).closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.origin === location.origin || anchor.target === "_blank")
        return;
      const id = anchor.closest<HTMLElement>(".window[id]")?.id;
      if (id) remember(id);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [remember]);
}
