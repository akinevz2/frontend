export type SlideDirection = "left" | "right" | "down";

/**
 * Side the destination page enters from. `order` is the menu order of page
 * identifiers (e.g. paths). A destination listed after the current page
 * enters from the right, one before it from the left. When no ordering can be
 * decided (unknown identifier, same page, no origin) it slides downwards.
 */
export function resolveDirection(
  from: string | null | undefined,
  to: string,
  order: readonly string[],
): SlideDirection {
  if (from == null || from === to) return "down";
  const a = order.indexOf(from);
  const b = order.indexOf(to);
  if (a < 0 || b < 0) return "down";
  return b > a ? "right" : "left";
}

export type SlideOffset = { x: string; y: string };

/** Starting translate offset of the incoming window for a direction. */
export function offsetFor(
  direction: SlideDirection,
  distance: string,
): SlideOffset {
  switch (direction) {
    case "left":
      return { x: `calc(-1 * ${distance})`, y: "0px" };
    case "right":
      return { x: distance, y: "0px" };
    case "down":
      return { x: "0px", y: `calc(-1 * ${distance})` };
  }
}
