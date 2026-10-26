import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import { descendantIds, flatten, lineage, type WindowNode } from "./model";
import { freshArrival, windowBookmark } from "@/lib/history";
import { CLIPPY_LINK } from "@/lib/clippy";
import {
  useRetained,
  useSignalHandler,
  useSignals,
  type SignalManifest,
} from "@/lib/signals";

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

/** Seeds the store synchronously from the URL: if the location (or the
 * history entry's off-site bookmark — windowBookmark) names a target
 * window (?post=slug / #tree-index), it starts REVEALED — expanded
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
  // A FRESH permalink (a new tab from the Permalink button, typed,
  // shared): the landing IS the maximized view — the maximized view is
  // the section's own page. Seeded on the very first render, so no
  // un-maximized frame flashes. The view is a FRAMING, not a reveal:
  // no lineage seeding, no subtree seeding.
  if (freshArrival() && namedByUrl(target)) {
    state[target.id] = { maximized: true, minimized: false };
    return state;
  }
  // A maximize push popped back (or forward) onto — its state bookmark
  // and URL name the same window: the framing return. Only the
  // target's lineage (self + ancestors) opens; the maximized view kept
  // the inner sections' flags and so does the landing (fixes the
  // configs Gallery: returning from the OK link does not unfold the
  // section's whole subtree).
  if (windowBookmark() === target.id && namedByUrl(target)) {
    for (const id of lineage(target.id))
      state[id] = { expanded: true, minimized: false };
    return state;
  }
  // The plain permalink / hash-free off-site return: the section comes
  // back with its whole subtree expanded (revealing inline needs every
  // ancestor expanded too — a collapsed parent never mounts the target).
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
  const [state, dispatchReducer] = useReducer(reducer, [], () =>
    initialFlags(roots),
  );
  const windows = useMemo(() => flatten(roots), [roots]);
  const { dispatch } = useSignals();

  const store = useMemo<WindowStore>(() => {
    const flagsOf = (id: string) => state[id] ?? {};
    return {
      windows,
      permalinkMode,
      onLeave,
      remember: (id) => {
        const node = windows.find((w) => w.id === id);
        if (node)
          dispatch("history:remember", {
            id,
            url: bookmarkUrlFor(node, permalinkMode),
          });
      },
      flagsOf,
      patch: (id, flags) =>
        dispatchReducer({ type: "patch", ids: [id], flags }),
      expand: (id) =>
        // Revealed content shows inline: a stale minimized flag on the
        // lineage (a window parked earlier by the minimize dismissal)
        // would leave the revealed target on its OK-row body — the
        // reveal un-minimizes what it expands.
        dispatchReducer({
          type: "patch",
          ids: lineage(id),
          flags: { expanded: true, minimized: false },
        }),
      restore: (id) => dispatchReducer({ type: "restore", ids: lineage(id) }),
      parked: windows.filter((w) => {
        return state[w.id]?.closed;
      }),
    };
  }, [state, windows, permalinkMode, onLeave, dispatch]);

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

/** The OFF-SITE bookmark's URL form: the page's own address WITHOUT a
 * per-section hash — the blog keeps its ?post= slug (that form IS the
 * section's permalink; no hash is involved), every other page keeps the
 * bare path with its query. The section id rides the entry's state
 * payload (history:remember's handler), so the departure the back
 * button returns to stays hash-free while still naming the window. */
function bookmarkUrlFor(node: WindowNode, mode: PermalinkMode): string {
  if (mode === "post" && node.depth > 0 && node.heading) {
    return `${location.pathname}?post=${encodeURIComponent(toSlug(node.heading))}`;
  }
  return location.pathname + location.search;
}

/** The window named by the URL — or by the history entry's BOOKMARK:
 * ?post=slug (the blog's permalink mode) addresses a post by heading,
 * #tree-index addresses any window by id, and the ?post/hash lookup
 * loses to nothing — the bookmark answers only when the URL names no
 * window at all, which is exactly the off-site departure's form (the
 * entry went out hash-free, its state carries the window that left).
 * ?post wins when both a slug and a hash are set (they could name
 * different windows); the hash is the fallback over the bookmark. */
function findTarget(windows: WindowNode[]) {
  const slug = new URLSearchParams(location.search).get("post");
  if (slug) {
    const post = windows.find(
      (w) => w.depth > 0 && w.heading && toSlug(w.heading) === slug,
    );
    if (post) return post;
  }
  const hash = location.hash.slice(1);
  if (hash) return windows.find((w) => w.id === hash);
  return windows.find((w) => w.id === windowBookmark());
}

/** Whether the URL itself names the window (the hash or the blog's
 * ?post= slug) — as opposed to the off-site form, where ONLY the
 * entry's state bookmark carries the id. Used to tell the three
 * landing shapes apart: a fresh permalink, a maximize push popped
 * back/forward onto, and the hash-free off-site return. */
const namedByUrl = (target: WindowNode): boolean => {
  const slug = new URLSearchParams(location.search).get("post");
  if (slug && target.depth > 0 && target.heading)
    return toSlug(target.heading) === slug;
  return decodeURIComponent(location.hash.slice(1)) === target.id;
};

/** Confirms the window named by the URL, once per page load. The store is
 * already seeded synchronously with the target revealed (initialFlags) so
 * the FIRST paint shows it expanded with no late pop-open; this effect
 * only re-applies the identical confirmation through the reveal signal
 * (the store's handler performs the expansion — see useReveal). The
 * landing splits three ways, mirroring initialFlags's seeding:
 *
 * - Fresh permalink (the Permalink button's new tab, typed, shared) on
 *   a URL that names the window: the store already holds maximized:true
 *   — no reveal, no scroll (the maximized view IS the landing), and the
 *   arrival entry is ANCHORED to the permalink (mode "replace") so the
 *   mount carries the bookmark key: dismissals settle on it
 *   (stillOwnsEntry) and a refresh stays maximized.
 * - A maximize push popped back/forward/reload onto (its entry's state
 *   bookmark and the URL name the same window): the framing confirm —
 *   reveal "none", only the target's lineage was seeded, collapsed
 *   sections stay collapsed (the configs Gallery fix).
 * - The plain permalink / hash-free off-site return: the whole-subtree
 *   reveal (descendants "all"). */
export function usePermalinkTarget() {
  const { windows, permalinkMode } = useWindowStore();
  const { dispatch } = useSignals();
  useEffect(() => {
    const target = findTarget(windows);
    if (!target) return;
    if (freshArrival() && namedByUrl(target)) {
      dispatch("history:anchor", {
        id: target.id,
        url: permalinkFor(target, permalinkMode),
        mode: "replace",
      });
      return;
    }
    if (windowBookmark() === target.id && namedByUrl(target)) {
      // Framing only: the target itself, never its descendants.
      dispatch("window:reveal", { id: target.id, descendants: "none" });
      if (location.hash) return;
      const el = document.getElementById(target.id);
      if (el)
        window.scrollTo({
          top: el.getBoundingClientRect().top + window.scrollY,
        });
      return;
    }
    // The reveal (lineage + whole subtree) rides the signal bus: nothing
    // lifts and nothing scrolls here for hash arrivals — the pageSlide
    // theme lands the page.
    dispatch("window:reveal", { id: target.id, descendants: "all" });
    if (location.hash) return;
    // Plain instant scroll: hash arrivals ride the theme's smooth
    // landing; query-only ones land here, retail-instant.
    const el = document.getElementById(target.id);
    if (el)
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY });
  }, []);
}

/** The reveal COMMAND's store handler. Announced for any flow that opens
 * a window's content without lifting it — permalink confirms, same-path
 * returns, maximized-rail dismissals — this expands the target's lineage
 * first (a collapsed parent never mounts its target) and then either its
 * direct children or the whole subtree. It never touches maximized
 * flags: revealing is a framing-free expansion. Must subscribe BEFORE
 * any mount-time dispatcher (order inside Roots), so a confirm dispatch
 * is not missed on the first render. */
export function useReveal() {
  const { windows, expand, patch } = useWindowStore();
  useSignalHandler("window:reveal", ({ id, descendants }) => {
    expand(id);
    const node = windows.find((w) => w.id === id);
    const revealed =
      !node || descendants === "none"
        ? []
        : descendants === "all"
          ? descendantIds(windows, id)
          : node.children.flatMap((c) =>
              c.kind === "window" ? [c.node.id] : [],
            );
    for (const child of revealed)
      patch(child, { expanded: true, minimized: false });
  });
}

/** REPAIRS the same-path history return. Traversals that keep the route
 * (same pathname, hash/query-only entries — the blog's ?post= form)
 * never remount the page: the store still holds the flags it left with.
 * Every maximized window the traversal LEFT (its maximize push was
 * popped — the URL hash no longer names it) gets the minimize
 * dismissal through window:minimize: the browser back button out of the
 * maximized view plays the minimize click, slides the window off and
 * parks it — back out of a maximized section IS minimizing it. One
 * whose id the URL still names keeps the foreground (a stacked
 * window's entry is active again, or forward onto its push). The
 * URL's target — hash, ?post= slug or the off-site bookmark —
 * re-expands with its subtree, landing on the section instead of
 * re-showing the lifted window. The query-only landing happens here
 * too (only the store resolves ?post= to its element); hash landings
 * stay the pageSlide theme's scrollToHash. Cross-page returns (a
 * REMOUNTED route) don't need this — their fresh store confirms via
 * usePermalinkTarget. */
export function usePageReturn() {
  const { windows, flagsOf } = useWindowStore();
  const { dispatch } = useSignals();
  useSignalHandler("page:returned", () => {
    const named = location.hash.slice(1);
    for (const w of windows) {
      if (!flagsOf(w.id).maximized || w.id === named) continue;
      dispatch("window:minimize", { id: w.id });
    }
    const target = findTarget(windows);
    if (!target) return;
    // The return landing mirrors the remount's: back onto a maximize
    // push (bookmark + URL name the same window) is a FRAMING — the
    // inner sections keep their flags, no subtree cascade (the configs
    // Gallery fix); every other return reveals the whole subtree.
    if (windowBookmark() === target.id && namedByUrl(target))
      dispatch("window:reveal", { id: target.id, descendants: "none" });
    else dispatch("window:reveal", { id: target.id, descendants: "all" });
    if (location.hash) return;
    const el = document.getElementById(target.id);
    if (el)
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY });
  });
}

/** Links clicked inside a window remember it. An off-site same-tab
 * departure (a full document navigation) and an internal same-tab one
 * (the router's SPA push — "job search" → /resume) BOTH bookmark the
 * window into the entry they LEAVE, so the browser back lands on the
 * section revealed and scrolled to. The listener is capture-phase at
 * document level, so it runs BEFORE the <Link>'s own handler: the
 * bookmark is written while the current entry is still the page being
 * left — anything later (the router's pushState) has already made the
 * DESTINATION entry current. Modifier clicks and target=_blank leave
 * nothing behind (the leaving tab never leaves), and the Clippy
 * trigger link departs nowhere at all. */
export function useRememberLeave() {
  const { remember } = useWindowStore();
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor = (event.target as Element).closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      // New tabs leave nothing behind and the Clippy trigger link
      // departs nowhere: a _blank tab restores the session entry's
      // state as it stands (a bookmark would double-apply), and the
      // Clippy link navigates to nowhere — its bookmark would be stale
      // on an entry that never left.
      if (
        anchor.target === "_blank" ||
        anchor.getAttribute("href") === CLIPPY_LINK
      )
        return;
      const id = anchor.closest<HTMLElement>(".window[id]")?.id;
      if (id) remember(id);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [remember]);
}
