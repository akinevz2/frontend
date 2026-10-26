import type { WindowNode } from "./model";
import { hasTheme } from "./model";
import type { SignalManifest } from "@/lib/signals";

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

/** The ✕ close's sound, declared. The crunchy kick backs every ✕ press
 * that STAYS on the page — refusals (Clippy veto, "funny" windows),
 * local collapses, Clippy parks, maximized restores — while the
 * Click.ogg is reserved for the ✕ that navigates away to a new page
 * (that gesture's pageSlide fold click is muted in closeSounds.ts, so
 * the navigation gets exactly one click). The sound's name is owned by
 * the window:closed manifest entry; this policy maps a press to it. */
export type CloseSound = SignalManifest["window:closed"]["sound"];

export const closeSound = (navigates: boolean): CloseSound =>
  navigates ? "click" : "kick";

/** `open` windows are always expanded and have no OK button. */
export const forcesExpanded = (node: WindowNode): boolean =>
  hasTheme(node, "open");
