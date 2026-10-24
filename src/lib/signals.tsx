import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
  "window:close": { id: string; refuse: () => void };
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
