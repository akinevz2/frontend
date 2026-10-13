import { getCookie, setCookie } from "./cookies";

export const LILAC_CLASS = "theme-lilac";
const LILAC_COOKIE = "wow-username-theme";

export function applyStoredTheme() {
  if (getCookie(LILAC_COOKIE) === LILAC_CLASS) {
    document.documentElement.classList.add(LILAC_CLASS);
  }
}

export function activateLilac() {
  document.documentElement.classList.add(LILAC_CLASS);
  setCookie(LILAC_COOKIE, LILAC_CLASS, 365 * 10);
}

/** Briefly toggles a root class (used for Clippy border/shadow flashes). */
export function flashRootClass(className: string, ms = 180) {
  const root = document.documentElement;
  root.classList.add(className);
  window.setTimeout(() => root.classList.remove(className), ms);
}
