import type { WindowNode } from "./model";
import { hasTheme } from "./model";

export const dataTheme = (node: WindowNode): string | undefined =>
  node.themes.length ? node.themes.join(" ") : undefined;

/** `open` windows are always expanded and have no OK button. */
export const forcesExpanded = (node: WindowNode): boolean =>
  hasTheme(node, "open");
