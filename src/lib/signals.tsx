import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";

/** The named signals of the app: every entry declares a signal's
 * payload, and dispatching and handling are checked against it. Four
 * shapes live here — commands ("app:navigate": a handler performs the
 * behaviour), notices ("page:loaded", "page:navigated": fire-and-forget
 * monitoring), refusable requests ("window:close": handlers may call
 * refuse() before the dispatch returns) and RETAINED notices
 * ("window:hidden": the last snapshot stays readable, see RETAINED).
 * Handlers run synchronously inside the dispatching stack: keep them
 * side-effect-first, no long work, no awaits. */
export type SignalManifest = {
  "app:navigate": { to: string };
  "page:loaded": { path: string };
  "page:navigated": { from: string; to: string };
  /** History traversal landed on a route (browser back/forward): the
   * page RETURNED — unlike a permalink arrival, a same-path traversal
   * does not remount it, so the page holds the flags it left with. */
  "page:returned": { path: string; hash: string };
  "window:close": { id: string; refuse: () => void };
  /** Notice — Clippy parked the window the ✕ was pressed on (the
   * mascot-on-screen easter egg): the successful close routed through
   * Clippy's keep. Clippy owns the outcome and pipes up ("oh where did
   * that go?.. I can help!"), offering its unhide roster. */
  "clippy:hid": { id: string };
  /** THE close's outcome NOTICE, with its sound DECLARED: the ✕ press
   * dispatches which sound should play — the crunchy kick for every
   * press that stays on the page (refusals, collapses, parks,
   * maximized restores), the Click.ogg for the press that navigates
   * away. One renderer (closeSounds.ts) plays what is declared. */
  "window:closed": { id: string; sound: "kick" | "click" };
  /** Command — the listening window's controller lifts the maximized
   * view (the OK middleware rides this instead of threading a callback
   * prop through the tree). */
  "window:maximize": { id: string };
  /** Command — restore/silently-dismiss the maximized view: ✕ on a
   * maximized window, Escape, the out-of-bounds backdrop click and the
   * title-bar Restore all ride this; the window's controller restores
   * the flags it left with. `reveal: true` additionally reveals the
   * content inline after the restore (the rail's OK/Cancel pair) —
   * restore alone is the silent framing dismissal it always was. */
  "window:dismiss": { id: string; reveal?: boolean | undefined };
  /** Command — THE minimize: one path for every minimize gesture and
   * its callbacks. On a maximized window the dismissal plays the
   * minimize click (Click.ogg), slides the window off and either
   * RESTORES the section underneath exactly as it stood at maximize
   * time (park unset — the browser back out of the maximized view: the
   * traversal pops the maximize push and the page:returned repair
   * dispatches this) or COLLAPSES it the way the inline minimize
   * handler always does (park set — the title-bar minimize button, and
   * the double-click on the maximized title bar: the maximized overlay
   * AND the section underneath both minimize; the section lands in its
   * normal resting shape, OK bottom-right). Inline the depth-0 fold
   * navigates away; every other inline window collapses to its title
   * bar's ok row. The window's own controller performs the branch —
   * every window listens, only the named one acts. */
  "window:minimize": { id: string; park?: boolean };
  /** Command — expand the named window WITHOUT lifting it: its lineage
   * always opens (a collapsed parent never mounts its target), then
   * either nothing but the target itself ("none" — the maximized view
   * restored inline: a framing, not a reveal — collapsed sections stay
   * collapsed), its direct children, or the whole subtree ("all"). The
   * maximized framing keeps a returned section's inner sections as
   * they stood — no force-open cascade behind the backdrop. */
  "window:reveal": { id: string; descendants: "none" | "direct" | "all" };
  /** Command — the history owner (lib/history) writes the named window
   * into the CURRENT history entry: the id rides the entry's state
   * payload ("window" key), the URL goes to what the caller computed.
   * mode "push" is the maximized view's own history entry (browser back
   * then pops INTO it: one entry per maximize, back un-maximizes);
   * mode "replace" settles the URL after an in-page dismissal, dropping
   * the bookmark when no maximized window remains. */
  "history:anchor": {
    /** Absent: clear the entry's bookmark (the last maximized window
     * was dismissed); present: the window the entry names. */
    id?: string | undefined;
    url: string;
    mode: "push" | "replace";
  };
  /** Command — bookmark the named window for an OFF-SITE departure: the
   * CURRENT entry's state gains "window" and the URL lands on the
   * caller's hash-free form, so navigating back to this entry (cross
   * document, a fresh boot) reveals and scrolls to the section while
   * the address bar carries no hash of it. */
  "history:remember": { id: string; url: string };
  "window:hidden": {
    items: Array<{ id: string; label: string }>;
    restore: (id: string) => void;
  }; // retained — the parked-window roster; readers hold no state of their own
};

/** The roster of no parked windows: both the retained seed and the
 * answer broadcasters send when the roster empties, so snapshot
 * identity is stable across every empty interval. */
export const EMPTY_HIDDEN: SignalManifest["window:hidden"] = {
  items: [],
  restore: () => {},
};

/** Which signals RETAIN their last payload at module scope, seeded
 * before the first dispatch. A retained signal's consumers are
 * render-time READERS (useSignalValue) instead of effect-bound
 * handlers: no useState bridge, no subscription management. A retained
 * publisher must send a fresh snapshot object per change and never
 * recompute the current one on read — useRetained does both. */
export const RETAINED: Partial<Record<SignalName, SignalManifest[SignalName]>> =
  {
    "window:hidden": EMPTY_HIDDEN,
  };

export type SignalName = keyof SignalManifest;

export type SignalHandler<Name extends SignalName = SignalName> = (
  payload: SignalManifest[Name],
) => void;

/** Handlers registered per signal name. The never-parameter shape keeps
 * the registry untyped internally while dispatch/on stay fully typed. */
type AnyHandler = (payload: never) => void;
const handlers = new Map<SignalName, Set<AnyHandler>>();

/** The last dispatched payload of each retained signal, and the cached
 * getSnapshot of every one: identity is stable between dispatches, as
 * useSyncExternalStore requires. */
const lastRetained = new Map<SignalName, SignalManifest[SignalName]>();
const retainedListeners = new Map<SignalName, Set<() => void>>();
const cachedSnapshot = (name: SignalName): SignalManifest[SignalName] =>
  lastRetained.get(name) ?? RETAINED[name] ?? EMPTY_HIDDEN;

/** Dispatches a named signal: every current handler runs synchronously,
 * in registration order, over a snapshot (handlers may unsubscribe or
 * dispatch further signals mid-flight). Retained signals take their new
 * snapshot BEFORE the handlers run (handlers read a consistent world)
 * and their readers re-render AFTER they settle (no mid-dispatch
 * render). The bus lives at module scope so machinery outside React —
 * the pageSlide theme, lib singletons — dispatches and listens too; the
 * context below makes it ambient for components. */
export function dispatchSignal<Name extends SignalName>(
  name: Name,
  payload: SignalManifest[Name],
): void {
  if (name in RETAINED) lastRetained.set(name, payload);
  const registered = handlers.get(name);
  if (registered) {
    for (const handler of [...registered]) {
      (handler as SignalHandler<Name>)(payload);
    }
  }
  const listeners = retainedListeners.get(name);
  if (listeners) {
    for (const listener of [...listeners]) listener();
  }
}

/** Subscribes a handler to a named signal; returns the unsubscribe. */
export function onSignal<Name extends SignalName>(
  name: Name,
  handler: SignalHandler<Name>,
): () => void {
  let registered = handlers.get(name);
  if (!registered) handlers.set(name, (registered = new Set()));
  const entry = handler as AnyHandler;
  registered.add(entry);
  return () => {
    registered?.delete(entry);
  };
}

/** Subscribes a render-time reader of a retained signal's snapshots;
 * returns the unsubscribe. The never-parameter shape defers to the same
 * internal typing as the handler registry. */
function onRetained(name: SignalName, listener: () => void): () => void {
  let registered = retainedListeners.get(name);
  if (!registered) retainedListeners.set(name, (registered = new Set()));
  registered.add(listener);
  return () => {
    registered?.delete(listener);
  };
}

type SignalBus = {
  dispatch: typeof dispatchSignal;
  on: typeof onSignal;
};

const Ctx = createContext<SignalBus | null>(null);

/** Wraps the app in the abstract signal context. The bus is shared and
 * stable, so the provider never re-renders consumers — signals are
 * events, not state. */
export function SignalProvider({ children }: { children: ReactNode }) {
  const bus = useMemo<SignalBus>(
    () => ({ dispatch: dispatchSignal, on: onSignal }),
    [],
  );
  return <Ctx.Provider value={bus}>{children}</Ctx.Provider>;
}

export function useSignals(): SignalBus {
  const bus = useContext(Ctx);
  if (!bus) throw new Error("useSignals needs a SignalProvider");
  return bus;
}

/** Subscribes a handler for the component's lifetime; the latest handler
 * closure runs on every dispatch (no resubscription churn). THE one
 * component-scoped escape hatch: for handlers that must close over
 * component state no module-level attach can reach (e.g. the window
 * store's return repair). Behaviours with a module owner attach via
 * onSignal instead of calling this. */
export function useSignalHandler<Name extends SignalName>(
  name: Name,
  handler: SignalHandler<Name>,
): void {
  const { on } = useSignals();
  const latest = useRef(handler);
  latest.current = handler;
  useEffect(() => on(name, (payload) => latest.current(payload)), [name, on]);
}

/** Reads a retained signal's current snapshot at render time: the
 * subscription lifecycle is useSyncExternalStore's business, not the
 * component's — no useState bridge, no manual effect, no missed first
 * publish. */
export function useSignalValue<Name extends SignalName>(
  name: Name,
): SignalManifest[Name] {
  const subscribe = useCallback(
    (onChange: () => void) => onRetained(name, onChange),
    [name],
  );
  return useSyncExternalStore(
    subscribe,
    () => cachedSnapshot(name) as SignalManifest[Name],
  );
}

/** Declares a retained publication: the publisher hands in the
 * snapshot it currently holds (a fresh object per change) and commits
 * nothing itself — the library broadcasts it post-render whenever its
 * identity changes and restores the manifest seed on unmount, so a
 * publisher's reader never sees a stale roster after the page that
 * parked the window is gone. Publishers stay declarative: no dispatch
 * choreography, no teardown effect. */
export function useRetained<Name extends SignalName>(
  name: Name,
  snapshot: SignalManifest[Name],
): void {
  useEffect(() => {
    dispatchSignal(name, snapshot);
    return () => dispatchSignal(name, RETAINED[name] as SignalManifest[Name]);
  }, [name, snapshot]);
}
