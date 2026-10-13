import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import { clearHidden, publishHidden } from "./hidden";
import { flatten, lineage, type WindowNode } from "./model";

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
  const [state, dispatch] = useReducer(reducer, {});
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

/** Blog posts are addressed as ?post=slug, everything else by #tree-index. */
export function permalinkFor(node: WindowNode, mode: PermalinkMode): string {
  const { origin, pathname } = window.location;
  if (mode === "post" && node.heading) {
    return `${origin}${pathname}?post=${encodeURIComponent(toSlug(node.heading))}`;
  }
  return `${origin}${pathname}#${node.id}`;
}

function findTarget(windows: WindowNode[], mode: PermalinkMode) {
  if (mode === "post") {
    const slug = new URLSearchParams(location.search).get("post");
    return slug
      ? windows.find(
          (w) => w.depth > 0 && w.heading && toSlug(w.heading) === slug,
        )
      : undefined;
  }
  const hash = location.hash.slice(1);
  return windows.find((w) => w.id === hash);
}

/** Opens and scrolls to the window named by the URL, once per page load. */
export function usePermalinkTarget(mode: PermalinkMode) {
  const { windows, expand } = useWindowStore();
  useEffect(() => {
    const target = findTarget(windows, mode);
    if (!target) return;
    expand(target.id);
    const timer = setTimeout(
      () =>
        document
          .getElementById(target.id)
          ?.scrollIntoView({ behavior: "smooth" }),
      100,
    );
    return () => clearTimeout(timer);
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
