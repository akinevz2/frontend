/** Summoned-hint dragging (docs/LEARNING_PLAN.md §7.4): pointer events
 * on the title bar ONLY, with setPointerCapture and touch-action:none
 * confined to summoned title bars. The position lives in the CSS
 * custom properties --dx/--dy on the window element — written DIRECTLY
 * during pointermove, so there is no React re-render per move; the
 * store sees only the mutations (raise on pointerdown, position on
 * drop), which the summon layer's persistence effect lands in
 * sessionStorage.
 *
 * Keyboard: with the title bar focused, arrow keys move 16px (Shift:
 * 64px) — those go THROUGH the store (one re-render per keypress is
 * fine) and persist the same way. Escape still closes (Window owns
 * that). Everything is disabled in the stacked mobile layout.
 */

import { clampEntry } from "@/lib/learningStorage";

/** The stacked-layout query — dragging (pointer AND keyboard) is
 * disabled there (§7.4). Guarded: matchMedia can be absent (tests). */
export const STACKED_QUERY = "(max-width: 768px)";

export const isStackedLayout = (): boolean =>
  typeof window !== "undefined" &&
  Boolean(window.matchMedia?.(STACKED_QUERY)?.matches);

/** The keyboard step for a movement key, or undefined (the key is not
 * one). Pure — unit-tested. */
export function keyStep(
  key: string,
  shift: boolean,
): { dx: number; dy: number } | undefined {
  const distance = shift ? 64 : 16;
  switch (key) {
    case "ArrowLeft":
      return { dx: -distance, dy: 0 };
    case "ArrowRight":
      return { dx: distance, dy: 0 };
    case "ArrowUp":
      return { dx: 0, dy: -distance };
    case "ArrowDown":
      return { dx: 0, dy: distance };
    default:
      return undefined;
  }
}

/** One keyboard move applied to a position. Pure — unit-tested. */
export function keyboardMove(
  position: { x: number; y: number; z: number },
  step: { dx: number; dy: number },
): { x: number; y: number; z: number } {
  return {
    x: position.x + step.dx,
    y: position.y + step.dy,
    z: position.z,
  };
}

/** The lesson container the summoned windows float in — registered by
 * the summon layer (the same module-level pattern as summonFocus). */
let containerEl: HTMLElement | null = null;

export function registerLessonContainer(
  element: HTMLElement | null,
): () => void {
  containerEl = element;
  return () => {
    if (containerEl === element) containerEl = null;
  };
}

/** The registered lesson container, or undefined (keyboard movement
 * clamps against it). */
export const summonContainer = (): HTMLElement | undefined =>
  containerEl ?? undefined;

/** The title bar's aria-describedby instructions (§7.4: "State the
 * instructions in the title bar's aria-describedby text"). */
export const DRAG_HINT =
  "arrow keys move this window 16 pixels, or 64 pixels with Shift " +
  "held; press Escape to close it";

/** Clamps a container-space position so the window stays inside the
 * lesson container AND inside the viewport (§7.4). Pure in its inputs;
 * the DOM reads happen at the call sites. */
export function clampToBounds(
  x: number,
  y: number,
  element: HTMLElement,
  container: HTMLElement,
): { x: number; y: number } {
  const rect = element.getBoundingClientRect();
  const bounds = container.getBoundingClientRect();
  const maxX = Math.min(
    bounds.width - rect.width,
    window.innerWidth - bounds.left - rect.width,
  );
  const maxY = bounds.height - rect.height;
  const clamped = clampEntry(
    { id: "", x, y, z: 1 },
    { maxX: Math.max(0, maxX), maxY: Math.max(0, maxY) },
  );
  return { x: clamped.x, y: clamped.y };
}

/** The current --dx/--dy of a window element (its dragged position). */
const draggedPositionOf = (element: HTMLElement): { x: number; y: number } => {
  const style = element.style;
  return {
    x: Number.parseFloat(style.getPropertyValue("--dx")) || 0,
    y: Number.parseFloat(style.getPropertyValue("--dy")) || 0,
  };
};

type BeginArgs = {
  /** The React pointer event on the title bar (left button, primary
   * pointer only). */
  event: {
    clientX: number;
    clientY: number;
    pointerId: number;
    isPrimary: boolean;
    button: number;
    currentTarget: HTMLElement;
  };
  /** The summoned WINDOW element (receives --dx/--dy). */
  element: HTMLElement;
  /** Store mutations: raise fires on pointerdown; drop commits the
   * final clamped position (never during pointermove). */
  onRaise: () => void;
  onDrop: (position: { x: number; y: number }) => void;
};

/** The title bar's pointerdown → drag controller. Attaches move/up
 * listeners to the CAPTURING title bar; every move writes --dx/--dy
 * straight onto the window element (no re-render), clamped to the
 * container and the viewport; the drop commits through the store. */
export function beginSummonDrag({
  event,
  element,
  onRaise,
  onDrop,
}: BeginArgs): void {
  if (event.button !== 0 || !event.isPrimary) return;
  if (isStackedLayout()) return; // stacked: dragging disabled (§7.4)
  const container = containerEl;
  if (!container) return;

  const titleBar = event.currentTarget;
  const startX = event.clientX;
  const startY = event.clientY;
  const base = draggedPositionOf(element);

  // Raise on pointerdown (§7.4) — a store mutation, persisted by the
  // summon layer's effect like every other one.
  onRaise();

  try {
    titleBar.setPointerCapture(event.pointerId);
  } catch {
    /* capture is an optimization here, not a requirement */
  }

  const onMove = (e: PointerEvent) => {
    if (!e.isPrimary) return;
    const next = clampToBounds(
      base.x + (e.clientX - startX),
      base.y + (e.clientY - startY),
      element,
      container,
    );
    // DIRECT style writes — no React re-render per move (§7.4).
    element.style.setProperty("--dx", `${next.x}px`);
    element.style.setProperty("--dy", `${next.y}px`);
  };

  const onEnd = (e: PointerEvent) => {
    titleBar.removeEventListener("pointermove", onMove);
    titleBar.removeEventListener("pointerup", onEnd);
    titleBar.removeEventListener("pointercancel", onEnd);
    try {
      titleBar.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    // Persist on drop: one store mutation with the final clamped
    // position; React re-renders the same values it already shows.
    const final = draggedPositionOf(element);
    onDrop(clampToBounds(final.x, final.y, element, container));
  };

  titleBar.addEventListener("pointermove", onMove);
  titleBar.addEventListener("pointerup", onEnd);
  titleBar.addEventListener("pointercancel", onEnd);
}
