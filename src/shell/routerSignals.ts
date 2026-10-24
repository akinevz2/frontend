import { dispatchSignal, onSignal } from "@/lib/signals";

/** The shell's router-aware signal behaviours. Handlers live OUT of the
 * components: components only ever dispatch, and the behaviours they
 * trigger are attached once at boot (main.tsx) — no per-component
 * subscription effects. */

/** The route-change performer. Until the router binds its navigate,
 * the honest fallback is a full document assign. */
let go: (to: string) => void = (to) => window.location.assign(to);

/** Hands the bus the router's navigate implementation. App binds it
 * while rendering against the router context: an idempotent reference
 * swap of a stable framework function, nothing more. */
export function bindNavigate(impl: (to: string) => void): void {
  go = impl;
}

/** Attaches the shell's handlers and announces the boot route. The
 * handler is app-lifetime; the unsubscribe return is for symmetry —
 * main.tsx calls this once at boot and never detaches. */
export function attachRouterSignals(): () => void {
  // The navigation command: dispatching arrives from anywhere (menu
  // hotkeys, OK buttons, page Cancel buttons) and lands HERE, then the
  // pageSlide choreography rides the pushState it triggers, exactly as
  // a direct navigate() would.
  const offNavigate = onSignal("app:navigate", ({ to }) => go(to));
  // The boot announcement: the first route is live as soon as the
  // shell attaches — before the first paint, no post-render effect.
  // Every route change from here on arrives as the theme's
  // "page:navigated" (the authoritative commit point it owns).
  dispatchSignal("page:loaded", { path: location.pathname });
  return offNavigate;
}
