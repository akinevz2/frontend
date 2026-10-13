export type Direction = "left" | "right" | "down";

/**
 * Side the destination page arrives from, given the menu order of paths.
 * Later in the menu: right. Earlier: left. Anything undecidable: down.
 */
export function resolveDirection(
  from: string,
  to: string,
  order: readonly string[],
): Direction {
  const a = order.indexOf(from);
  const b = order.indexOf(to);
  if (a < 0 || b < 0 || a === b) return "down";
  return b > a ? "right" : "left";
}
