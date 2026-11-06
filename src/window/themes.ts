import type { WindowNode } from "./model";
import { hasTheme } from "./model";
import type { SignalManifest } from "@/lib/signals";

/** The themes a WindowNode carries, rendered onto its data-theme
 * attribute. The temporary experimental filter is GONE (2026-11): the
 * wobble css is now scoped to the window BODY (the title bar never
 * moves) and guarded against the maximized portal DOM - see the
 * Experimental block in window.css. */
export const dataTheme = (node: WindowNode): string | undefined => {
  const themes = node.themes;
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
