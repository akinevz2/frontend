import {
  applyTheme,
  clearThemeVariables,
  setTheme,
  type ThemeDefinition,
} from "lightdni-jssas-toggle";
import { resolveDirection, type Direction } from "./direction";
import "./pageSlide.css";

const CLASS = "theme-page-slide";
const ATTRIBUTE = "data-page-slide";
const DURATION_MS = 400;
const VARIABLES = [
  "--ps-duration",
  "--ps-in-x",
  "--ps-in-y",
  "--ps-out-x",
  "--ps-out-y",
  "--ps-pad-from",
];

/** Where the new page starts and the old one ends, per direction. */
const slide = (
  name: string,
  inX: string,
  inY: string,
  outX: string,
  outY: string,
): ThemeDefinition => ({
  className: CLASS,
  attributes: { [ATTRIBUTE]: name },
  variables: {
    "--ps-duration": `${DURATION_MS}ms`,
    "--ps-in-x": inX,
    "--ps-in-y": inY,
    "--ps-out-x": outX,
    "--ps-out-y": outY,
  },
});

const themes: Record<Direction, ThemeDefinition> = {
  right: slide("right", "100vw", "0", "-100vw", "0"),
  left: slide("left", "-100vw", "0", "100vw", "0"),
  down: slide("down", "0", "-100vh", "0", "100vh"),
};

const root = () => document.documentElement;
const applyDirection = (themeName: Direction) =>
  setTheme({
    themeName,
    themes,
    previousClassNames: [CLASS],
    persistence: "none",
    accessibility: { setColorScheme: false },
  });

const menuOrder = () =>
  [...document.querySelectorAll<HTMLAnchorElement>("nav [role=menuitem]")].map(
    (a) => new URL(a.href).pathname,
  );

/** Static copy of the outgoing page that slides off the screen. */
function leaveGhost(): void {
  root().style.removeProperty("--ps-pad-from");
  const main = document.querySelector("main");
  if (!main) return;
  const rect = main.getBoundingClientRect();
  const ghost = main.cloneNode(true) as HTMLElement;
  ghost.classList.add("page-slide-ghost");
  Object.assign(ghost.style, {
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    minHeight: "0",
  });
  const pageEl = main.querySelector<HTMLElement>(".page");
  const ghostPage = ghost.querySelector<HTMLElement>(".page");
  if (pageEl && ghostPage) {
    // Page padding can depend on elements (debug bar) that unmount with the
    // route: freeze it on the ghost and ease the new page away from it.
    const padding = getComputedStyle(pageEl).paddingBottom;
    ghostPage.style.paddingBottom = padding;
    root().style.setProperty("--ps-pad-from", padding);
  }
  ghost.removeAttribute("id");
  ghost.querySelectorAll("iframe, audio, video").forEach((el) => {
    const box = el.getBoundingClientRect();
    const placeholder = document.createElement("div");
    placeholder.style.cssText = `width:${box.width}px;height:${box.height}px`;
    el.replaceWith(placeholder);
  });
  document.body.appendChild(ghost);
  document.querySelectorAll<HTMLElement>("body > .debug-bar").forEach((bar) => {
    const leaving = bar.cloneNode(true) as HTMLElement;
    leaving.classList.add("page-slide-bar");
    // Layout rules key off this attribute; the clone must not keep them alive.
    leaving.removeAttribute("data-debug-bar");
    document.body.appendChild(leaving);
    window.setTimeout(() => leaving.remove(), DURATION_MS + 200);
  });
  const remove = () => ghost.remove();
  ghost.addEventListener("animationend", remove);
  window.setTimeout(remove, DURATION_MS + 200);
}

/** Restarts the CSS animation on the persistent <main> element. */
function arriveMain(): void {
  const main = document.querySelector("main");
  if (!main) return;
  main.style.animation = "none";
  void main.offsetWidth;
  main.style.animation = "";
}

let current = "";
let originalPushState: History["pushState"] | null = null;

function transition(to: string): void {
  if (to === current) return;
  const direction = resolveDirection(current, to, menuOrder());
  leaveGhost();
  applyDirection(direction);
  arriveMain();
  current = to;
}

const onPopState = () => transition(location.pathname);

/**
 * Adds the sliding page transition as a lightdni-jssas-toggle theme: the
 * initial load slides in from the top; later navigations (links, history
 * traversal) slide the old page out and the new one in from the opposite
 * edge, towards the side the destination sits on in the menu.
 */
export function enablePageSlide(): void {
  if (originalPushState || typeof document === "undefined") return;
  current = location.pathname;
  applyDirection("down");

  const original = history.pushState.bind(history);
  originalPushState = history.pushState;
  history.pushState = (data, unused, url) => {
    if (url != null) transition(new URL(url, location.href).pathname);
    original(data, unused, url);
  };
  window.addEventListener("popstate", onPopState);
}

/** Removes the theme, its variables and every hook installed by enable. */
export function disablePageSlide(): void {
  if (!originalPushState) return;
  history.pushState = originalPushState;
  originalPushState = null;
  window.removeEventListener("popstate", onPopState);
  applyTheme({}, { previousClassNames: [CLASS] });
  clearThemeVariables(VARIABLES);
  root().removeAttribute(ATTRIBUTE);
  document
    .querySelectorAll(".page-slide-ghost, .page-slide-bar")
    .forEach((el) => el.remove());
}
