import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";

/** The named signals of the app: every entry declares a signal's
 * payload, and dispatching and handling are checked against it. Three
 * shapes live here — commands ("app:navigate": a handler performs the
 * behaviour), notices ("page:loaded", "page:navigated": fire-and-forget
 * monitoring) and refusable requests ("window:close": handlers may call
 * refuse() before the dispatch returns). Handlers run synchronously
 * inside the dispatching stack: keep them side-effect-first, no long
 * work, no awaits. */
export type SignalManifest = {
  "app:navigate": { to: string };
  "page:loaded": { path: string };
  "page:navigated": { from: string; to: string };
  "window:close": { id: string; refuse: () => void };
  "window:hidden": {
    items: Array<{ id: string; label: string }>;
    restore: (id: string) => void;
  }; // notice — parked-window roster for Clippy; the LAST snapshot sent wins (no store)
};

export type SignalName = keyof SignalManifest;

export type SignalHandler<Name extends SignalName = SignalName> = (
  payload: SignalManifest[Name],
) => void;

/** Handlers registered per signal name. The never-parameter shape keeps
 * the registry untyped internally while dispatch/on stay fully typed. */
type AnyHandler = (payload: never) => void;
const handlers = new Map<SignalName, Set<AnyHandler>>();

/** Dispatches a named signal: every current handler runs synchronously,
 * in registration order, over a snapshot (handlers may unsubscribe or
 * dispatch further signals mid-flight). The bus lives at module scope
 * so machinery outside React — the pageSlide theme, lib singletons —
 * dispatches and listens too; the context below makes it ambient for
 * components. */
export function dispatchSignal<Name extends SignalName>(
  name: Name,
  payload: SignalManifest[Name],
): void {
  const registered = handlers.get(name);
  if (!registered) return;
  for (const handler of [...registered]) {
    (handler as SignalHandler<Name>)(payload);
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
 * closure runs on every dispatch (no resubscription churn). */
export function useSignal<Name extends SignalName>(
  name: Name,
  handler: SignalHandler<Name>,
): void {
  const { on } = useSignals();
  const latest = useRef(handler);
  latest.current = handler;
  useEffect(() => on(name, (payload) => latest.current(payload)), [name, on]);
}
