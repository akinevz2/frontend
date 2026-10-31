/** Tab navigation — the XP-window metaphor's keyboard traversal.
 *
 * Tab / Shift+Tab cycle:
 *  1. the menu items (the menu bar first),
 *  2. the visible buttons and links of the foreground — when a window
 *     is maximized, the cycle stays inside the maximized window's
 *     backdrop (the dimmed layer below it and the menu bar are out of
 *     reach: focus must not escape below it); otherwise it walks the
 *     page's windows.
 *  3. window decorations (title-bar controls, the ride-out clones)
 *     are never traversed — the chrome is the mouse's business.
 *
 * The cycle is computed per keypress: the DOM changes under the
 * keyboard (windows open, close, minimize, maximize), so no stale
 * stop list is cached. Typing inside an input keeps the browser's
 * native Tab behaviour.
 */

/** The window chrome: title-bar controls are decorations, not content. */
const isDecoration = (el: HTMLElement) =>
  el.closest(".title-bar, .title-bar-controls") !== null;

/** True while the user types in a text field: native Tab belongs to it. */
export const isTypingTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
    target.isContentEditable);

/** A candidate is a tab stop when it is interactive AND visible. */
function isStop(el: HTMLElement): boolean {
  const tag = el.tagName;
  const interactive =
    tag === "BUTTON" ||
    tag === "A" ||
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    (el.getAttribute("tabindex") !== null && el.tabIndex >= 0);
  if (!interactive) return false;
  const input = el as HTMLButtonElement;
  if (input.disabled || input.getAttribute("aria-disabled") === "true")
    return false;
  const style = getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return false;
  // getClientRects() is empty for display:none subtrees and detached
  // elements; visibility-hidden reports rects, hence the style check above.
  return el.getClientRects().length > 0;
}

/** The maximized windows currently on screen, topmost LAST (DOM order is
 *  the stacking order: each maximize pushes its backdrop after the
 *  previous ones). Empty when no window is maximized. */
const maximizedBackdrops = () =>
  [
    ...document.querySelectorAll<HTMLElement>(
      ".maximized-backdrop[data-window-id]",
    ),
  ].filter((backdrop) => backdrop.getClientRects().length > 0);

/** The traversal scope: the topmost maximized window when one exists,
 *  the whole page otherwise. The menu bar is a separate stage BEFORE
 *  the page and is excluded from maximized scopes (a maximized window
 *  covers the menu — focus must not reach it). */
function scopes(): HTMLElement[] {
  const backdrops = maximizedBackdrops();
  if (backdrops.length > 0) {
    const topmost = backdrops[backdrops.length - 1];
    return topmost ? [topmost] : [];
  }
  const page = document.querySelector<HTMLElement>("main.page");
  return page ? [page] : [];
}

/** One full cycle: the menu items, then the foreground's stops — in
 *  DOM order. Decorations and hidden windows are filtered out. */
export function tabStops(): HTMLElement[] {
  const menuItems = [
    ...document.querySelectorAll<HTMLElement>(".menu-bar a[role='menuitem']"),
  ].filter(isStop);
  const menuItemsReachable = maximizedBackdrops().length === 0;
  const stops: HTMLElement[] = [];
  if (menuItemsReachable) stops.push(...menuItems);
  for (const scope of scopes()) {
    for (const el of scope.querySelectorAll<HTMLElement>(
      "button, a, input, textarea, select, [tabindex]",
    )) {
      if (isDecoration(el) || !isStop(el)) continue;
      stops.push(el);
    }
  }
  return stops;
}

/** The section the cycle last traversed: Tab resumes from the TOP of
 *  this section instead of resetting to the menu bar. Set whenever a
 *  stop inside a .window is focused; cleared when the window is gone. */
let lastSection: HTMLElement | null = null;

/** The first stop inside a window subtree, or undefined. */
const firstStopInSection = (stops: HTMLElement[], section: HTMLElement) =>
  stops.find((el) => el.closest(".window") === section);

/** The first stop positioned AT or AFTER the section's start (Tab's
 *  resume point), and the last stop before it (Shift+Tab's). The
 *  section itself may be collapsed (its OK just revealed it), so the
 *  boundary is a DOM-position comparison, not a membership test. */
const sectionBoundary = (
  stops: HTMLElement[],
  section: HTMLElement,
): { forward: HTMLElement | undefined; backward: HTMLElement | undefined } => {
  const anchor = firstStopInSection(stops, section);
  const start = anchor ?? section;
  const forward =
    anchor ??
    stops.find(
      (el) =>
        (start.compareDocumentPosition(el) &
          Node.DOCUMENT_POSITION_FOLLOWING) !==
        0,
    );
  const backward = [...stops]
    .reverse()
    .find(
      (el) =>
        (start.compareDocumentPosition(el) &
          Node.DOCUMENT_POSITION_FOLLOWING) !==
        0,
    );
  return { forward, backward };
};

/** Move focus within the cycle. Returns the element that received it. */
export function focusNextStops(backwards: boolean): HTMLElement | undefined {
  const stops = tabStops();
  if (stops.length === 0) return undefined;
  const current = document.activeElement;
  const index = stops.findIndex((el) => el === current);
  let nextIndex: number;
  if (index === -1) {
    // Focus fell off the cycle (the just-pressed OK unmounted): resume
    // at the CURRENT section's boundary — the first stop of the
    // revealed section on Tab, the stop before it on Shift+Tab. No
    // section in play (or a stale one): the menu bar leads the cycle.
    const boundary = lastSection?.isConnected
      ? sectionBoundary(stops, lastSection)
      : undefined;
    const resume = backwards ? boundary?.backward : boundary?.forward;
    nextIndex = resume ? stops.indexOf(resume) : 0;
  } else {
    lastSection = stops[index]?.closest(".window") ?? null;
    nextIndex = (index + (backwards ? -1 : 1) + stops.length) % stops.length;
  }
  const next = stops[nextIndex];
  if (!next) return undefined;
  next.focus();
  return next;
}

/** The document-level Tab handler: the cycle is this module's business.
 *  Typing in a text field keeps the browser's native Tab behaviour. */
export function onTabKey(event: KeyboardEvent): void {
  if (event.key !== "Tab") return;
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (isTypingTarget(event.target)) return;
  event.preventDefault();
  focusNextStops(event.shiftKey);
}

/** Track the section the focus currently sits in — from EVERY focus
 *  change, not just Tab walks. The OK press that reveals a section is
 *  usually a mouse click: without this, the resume anchor would be
 *  stale (or null) and the cycle would reset to the menu bar. */
const noteSection = (event: FocusEvent): void => {
  const el = event.target;
  if (!(el instanceof HTMLElement)) return;
  lastSection = el.closest(".window") ?? null;
};

/** Test seam: reset the module's section anchor between scenarios. */
export function resetSectionAnchor(): void {
  lastSection = null;
}

/** Install the Tab handler on the document. Returns the unmount. */
export function installTabNavigation(): () => void {
  document.addEventListener("keydown", onTabKey);
  document.addEventListener("focusin", noteSection);
  return () => {
    document.removeEventListener("keydown", onTabKey);
    document.removeEventListener("focusin", noteSection);
  };
}
