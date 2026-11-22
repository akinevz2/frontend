/** The summon focus registry (docs/LEARNING_PLAN.md §7.2): which element
 * triggered each hint's summon, so Escape (in the window) and the
 * dialogue's Cancel return focus to the trigger link. Component-local
 * per the Phase 0 addendum — no new signal names; a module map keyed by
 * hint id is the smallest shared state the two renderers (the lesson
 * page's dialogue and the window's Escape handler) can agree on.
 *
 * Elements are held WEAKLY: the registry never keeps a removed trigger
 * alive, and lookups answer undefined once the page moved on.
 */

const triggers = new WeakMap<HTMLElement, string>();
const byId = new Map<string, WeakRef<HTMLElement>>();

/** Records `trigger` as the summon origin of hint `id`. */
export function setTrigger(id: string, trigger: HTMLElement): void {
  triggers.set(trigger, id);
  byId.set(id, new WeakRef(trigger));
}

/** The trigger element a hint was summoned from, or undefined (never
 * summoned this session, or its element is gone). */
export function triggerOf(id: string): HTMLElement | undefined {
  const ref = byId.get(id);
  const trigger = ref?.deref();
  if (!trigger) return undefined;
  // A stale entry (the trigger named a different hint since) is dropped.
  return triggers.get(trigger) === id ? trigger : undefined;
}

/** Returns focus to a hint's trigger link, when it still exists. The
 * recorded element can go STALE across summon/dismiss cycles (React
 * re-creates the anchor's DOM node) — when it is detached, fall back to
 * the fragment convention: the hint's id IS its trigger's href
 * fragment (docs/LEARNING_PLAN.md §5). */
export function refocusTrigger(id: string): void {
  const recorded = triggerOf(id);
  if (recorded?.isConnected) {
    recorded.focus();
    return;
  }
  const fresh = document.querySelector(`a[href="#${CSS.escape(id)}"]`);
  if (fresh instanceof HTMLElement) fresh.focus();
}
