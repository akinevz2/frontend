import type { WindowNode } from "./model";
import { hasTheme } from "./model";

/** TEMP STUB: the "experimental" theme is switched off — its wobble and
 * flash animations are noise while the OK/maximize choreography is being
 * reworked. Filtering it here disables every effect at once (all CSS keys
 * on [data-theme~="experimental"] and nothing in TS reads the theme)
 * without touching content files or stylesheets. Restore by deleting the
 * filter. */
export const dataTheme = (node: WindowNode): string | undefined => {
  const themes = node.themes.filter((theme) => theme !== "experimental");
  return themes.length ? themes.join(" ") : undefined;
};

/** The ✕ close's sound, declared. The crunchy kick plays ONLY when the
 * window does not close — a refused close (Clippy veto, "funny"
 * refusal) is the kick's moment. A navigation close (leave-on-close
 * pages: ✕ back to the index) closes, so it never kicks — its sound is
 * the pageSlide transition's own Click.ogg, which the window neither
 * plays nor suppresses. Parks and collapses close silently. */
export type CloseSound = "kick" | "transition-click" | "none";

export const closeSound = (closes: boolean, navigation: boolean): CloseSound =>
  !closes ? "kick" : navigation ? "transition-click" : "none";

/** `open` windows are always expanded and have no OK button. */
export const forcesExpanded = (node: WindowNode): boolean =>
  hasTheme(node, "open");
