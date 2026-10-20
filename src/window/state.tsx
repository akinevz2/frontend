import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import { clearHidden, publishHidden } from "./hidden";
import { descendantIds, flatten, lineage, type WindowNode } from "./model";

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
  /** Records the window in the URL so returning to the page reopens it. */
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
 * target window (?post=slug / #tree-index), it starts maximized with the
 * whole subtree expanded on the FIRST render. usePermalinkTarget's
 * post-paint effect normally applies these flags a frame later, but then
 * the page first paints the un-maximized main DOM and scrolls — the
 * maximized element pops into view over a polluted first frame. Rendering
 * the flags from the start shows the maximized overlay immediately, with
 * nothing below it ever committed. */
function initialFlags(roots: WindowNode[]): State {
  const windows = flatten(roots);
  const target = findTarget(windows);
  if (!target) return {};
  const state: State = {
    [target.id]: { maximized: true, minimized: false, expanded: true },
  };
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

  useEffect(() => {
    publishHidden({
      items: store.parked.map((w) => ({ id: w.id, label: w.heading ?? w.id })),
      restore: store.restore,
    });
  }, [store]);
  useEffect(() => clearHidden, []);

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
 * already seeded synchronously with the target maximized (initialFlags)
 * so the FIRST paint shows the fullscreen view with no inline flash;
 * this effect only re-applies the identical, idempotent patches. Both
 * link shapes arrive the same way: the target opens maximized in the
 * foreground with its whole subtree expanded. */
export function usePermalinkTarget() {
  const { windows, expand, patch } = useWindowStore();
  useEffect(() => {
    const target = findTarget(windows);
    if (!target) return;
    expand(target.id);
    // Arriving at a permalink reveals the target's whole subtree, not
    // just its own section (descendants expand, stale minimized flags
    // clear; closed/parked windows stay parked), then lifts it.
    for (const id of descendantIds(windows, target.id)) {
      patch(id, { expanded: true, minimized: false });
    }
    patch(target.id, { maximized: true, minimized: false });
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
