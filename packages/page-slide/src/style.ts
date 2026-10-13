export const STYLE_ELEMENT_ID = "page-slide-style";

export const VAR_FROM_X = "--page-slide-from-x";
export const VAR_FROM_Y = "--page-slide-from-y";
export const VAR_DURATION = "--page-slide-duration";

/**
 * Uses the individual `translate` property so the animation composes with
 * any `transform` the target already has. Scoped to the theme class, so
 * removing the class disables the effect entirely. The armed class is only
 * added by the first navigation, so the initial page load never animates.
 */
export function buildCss(
  themeClass: string,
  armedClass: string,
  targetSelector: string,
): string {
  return `
@keyframes page-slide-in {
  from { translate: var(${VAR_FROM_X}, 0px) var(${VAR_FROM_Y}, 0px); opacity: 0; }
  to { translate: 0 0; opacity: 1; }
}
html.${themeClass}.${armedClass} ${targetSelector} {
  animation: page-slide-in var(${VAR_DURATION}, 320ms) ease-out both;
}
@media (prefers-reduced-motion: reduce) {
  html.${themeClass}.${armedClass} ${targetSelector} { animation: none; }
}
`;
}

export function injectStyle(doc: Document, css: string): void {
  if (doc.getElementById(STYLE_ELEMENT_ID)) return;
  const el = doc.createElement("style");
  el.id = STYLE_ELEMENT_ID;
  el.textContent = css;
  doc.head.appendChild(el);
}

export function removeStyle(doc: Document): void {
  doc.getElementById(STYLE_ELEMENT_ID)?.remove();
}
