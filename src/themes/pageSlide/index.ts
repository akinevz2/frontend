import {
  applyTheme,
  clearThemeVariables,
  setTheme,
  type ThemeDefinition,
} from "lightdni-jssas-toggle";
import { playMinimizeClick } from "@/lib/audio";
import { resolveDirection, type Direction } from "./direction";
import "./pageSlide.css";

const CLASS = "theme-page-slide";
const ATTRIBUTE = "data-page-slide";
const DURATION_MS = 400;
/** Total fold duration (windows squash into the taskbar line). */
const MINIMIZE_MS = 98;
/** After the minimise beat, the page drops out of the bottom in one stroke. */
const DROP_DURATION_MS = 180;
const REMOVAL_MS = MINIMIZE_MS + DROP_DURATION_MS + 200;
const VARIABLES = [
  "--ps-duration",
  "--ps-minimize",
  "--ps-drop-delay",
  "--ps-drop-dur",
  "--ps-in-x",
  "--ps-in-y",
  "--ps-pad-from",
];

/** Where the new page starts, per direction. */
const slide = (name: string, inX: string, inY: string): ThemeDefinition => ({
  className: CLASS,
  attributes: { [ATTRIBUTE]: name },
  variables: {
    "--ps-duration": `${DURATION_MS}ms`,
    "--ps-minimize": `${MINIMIZE_MS}ms`,
    "--ps-drop-delay": `${MINIMIZE_MS}ms`,
    "--ps-drop-dur": `${DROP_DURATION_MS}ms`,
    "--ps-in-x": inX,
    "--ps-in-y": inY,
  },
});

const themes: Record<Direction | "parked", ThemeDefinition> = {
  right: slide("right", "100vw", "0"),
  left: slide("left", "-100vw", "0"),
  down: slide("down", "0", "-100vh"),
  /** Initial load ONTO a hyperlinked window target: the slide theme is
   * fully installed (its class drives minimize folds and the navigation
   * hooks) but with a zero-distance entrance — nothing visibly moves
   * while the maximized overlay is the page's first paint. */
  parked: slide("parked", "0", "0"),
};

const root = () => document.documentElement;
const applyDirection = (themeName: Direction | "parked") =>
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

/** Static copy of the outgoing page: windows minimise into their title bars,
 * then the whole page drops out of the bottom in one fast stroke. */
function leaveGhost(): void {
  root().style.removeProperty("--ps-pad-from");
  const main = document.querySelector("main");
  if (!main) return;
  // Measure the LIVE layout first — the detached clone reports zero-size
  // boxes, which is what used to blank the placeholders and collapse
  // windows instantly. querySelectorAll order is stable across cloneNode.
  const liveMedias = [...main.querySelectorAll("iframe, audio, video")];
  const mediaBoxes = liveMedias.map((el) => el.getBoundingClientRect());

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
  ghost.querySelectorAll("iframe, audio, video").forEach((el, i) => {
    const box = mediaBoxes[i];
    if (!box) return;
    const live = liveMedias[i];
    const isIframe = live?.tagName === "IFRAME";
    const placeholder = document.createElement("div");
    // Media can't be cloned into the static ghost; placeholders only carry
    // the layout box, with the document-paper look for iframes.
    placeholder.className = isIframe
      ? "page-slide-placeholder page-slide-placeholder-frame"
      : "page-slide-placeholder";
    placeholder.style.cssText = `width:${box.width}px;height:${box.height}px`;
    if (isIframe && live) {
      // Document frames keep their own paper background while the page
      // drops: the resume preview is styled white, and falling back to the
      // themed (dark) background reads as the PDF unloading mid-exit.
      // Transparent iframes (music embeds) keep the themed placeholder
      // background — a white flash there is visual pollution.
      const background = getComputedStyle(live).backgroundColor;
      if (
        background &&
        background !== "transparent" &&
        background !== "rgba(0, 0, 0, 0)"
      ) {
        placeholder.style.backgroundColor = background;
      }
    }
    el.replaceWith(placeholder);
  });
  // XP-style minimise: each top-level window folds down onto the taskbar
  // line — the bottom edge of the page — sucked toward it while shrinking.
  // The fold distance is measured per window; CSS does the squash.
  const taskbarLine = window.innerHeight;
  const topLevel = ".page > .window, .page > .maximized-shell > .window";
  ghost.querySelectorAll<HTMLElement>(topLevel).forEach((win, i) => {
    const liveWin = main.querySelectorAll(topLevel)[i];
    if (!liveWin) return;
    const dy = Math.max(
      0,
      taskbarLine - liveWin.getBoundingClientRect().bottom,
    );
    win.style.setProperty("--page-fold-dy", `${Math.round(dy)}px`);
  });
  document.body.appendChild(ghost);
  // Maximized overlays ride INSIDE the ghost now (they are in-tree), so
  // the dimmed layer and the maximized window fold and drop with the
  // page — no portal ride-out is needed on navigation.
  document.querySelectorAll<HTMLElement>("body > .debug-bar").forEach((bar) => {
    // A bar hidden by the maximized overlay rides nothing: cloning it
    // only paints a flash after the unlock (the folded ghost unparks
    // body:has while the ride is still alive).
    if (getComputedStyle(bar).display === "none") return;
    const leaving = bar.cloneNode(true) as HTMLElement;
    leaving.classList.add("page-slide-bar");
    // Layout rules key off this attribute; the clone must not keep them alive.
    leaving.removeAttribute("data-debug-bar");
    document.body.appendChild(leaving);
    // The live bar yields to the clone in the same frame — visibility,
    // not display, so the body padding rules keep reserving its row —
    // and the clone drops (and fades) with the page instead of the bar
    // blinking out at the route commit.
    bar.classList.add("page-slide-bar-hide");
    window.setTimeout(() => {
      leaving.remove();
      bar.classList.remove("page-slide-bar-hide");
    }, REMOVAL_MS);
  });
  const remove = (event?: Event) => {
    // Child windows bubbling their minimise-end must NOT retire the ghost —
    // wait for the drop animation on the ghost itself, or the timeout.
    if (
      event &&
      !(
        event.target === ghost &&
        (event as AnimationEvent).animationName === "page-slide-drop"
      )
    )
      return;
    ghost.remove();
  };
  ghost.addEventListener("animationend", remove);
  window.setTimeout(() => remove(), REMOVAL_MS);
}

let current = "";
let originalPushState: History["pushState"] | null = null;
/** Mutes the next transition's fold click: a window ✕ that navigates
 * closes with its own crunchy kick — no Click.ogg on top of it. */
let clickSuppressed = false;

export function suppressNextSlideClick(): void {
  clickSuppressed = true;
}

/** On mobile screens the appearing page always slides straight down
 * (from above) — the side-by-side menu-order metaphor doesn't read on
 * a narrow, wrapped menu. Matches the layout.css 768px breakpoint. */
const isMobileLayout = () => window.matchMedia("(max-width: 768px)").matches;

function transition(to: string, hash: string): void {
  if (to === current) return;
  if (clickSuppressed) clickSuppressed = false;
  else playMinimizeClick();
  const direction = isMobileLayout()
    ? "down"
    : resolveDirection(current, to, menuOrder());
  leaveGhost();
  applyDirection(direction);
  restartArrival();
  current = to;
  // A new page starts at the top — unless the url carries a hash, whose
  // element the navigation scrolls itself to (scrollToHash).
  if (!hash) window.scrollTo({ top: 0 });
}

/** Restart the just-applied destination slide so it runs in step with the
 * exit choreography (fold + drop happen while the page slides in). */
function restartArrival(): void {
  const main = document.querySelector("main");
  if (!main) return;
  main.style.animation = "none";
  void main.offsetWidth;
  main.style.animation = "";
  const pageEl = main.querySelector<HTMLElement>(".page");
  if (pageEl) {
    pageEl.style.animation = "none";
    void pageEl.offsetWidth;
    pageEl.style.animation = "";
  }
}

const onPopState = () => {
  if (location.pathname === current) {
    // Same-page history traversal only moves the hash: bring the
    // hyperlinked element into view (inside its scrolling window).
    if (location.hash) scrollToHash(location.hash);
    return;
  }
  transition(location.pathname, location.hash);
};

/** Scrolls the hash element into view — inside its scrolling window
 * (a maximized window scrolls its own revealed content) or the page.
 * The element can mount after the route commit (lazy pages), hence the
 * deferred retries. */
function scrollToHash(hash: string, attempts = 12): void {
  const id = decodeURIComponent(hash.slice(1));
  if (!id) return;
  const tick = () => {
    const el = document.getElementById(id);
    if (el) {
      // Maximized windows are viewport-fixed overlays; scrolling the page
      // behind them just resets the background while the overlay hides
      // it. The restored window scrolls itself to the hash element on
      // dismissal instead.
      if (!el.closest(".maximized-backdrop")) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }
    if (attempts > 0) window.setTimeout(tick, 100);
  };
  tick();
}

/**
 * Adds the sliding page transition as a lightdni-jssas-toggle theme: the
 * initial load slides in from the top; later navigations (links, history
 * traversal) slide the old page out and the new one in from the opposite
 * edge, towards the side the destination sits on in the menu.
 */
export function enablePageSlide(): void {
  if (originalPushState || typeof document === "undefined") return;
  current = location.pathname;
  // Initial load ONTO a hyperlinked window target (#hash or a blog
  // ?post= the route maximizes): install the theme "parked" so the
  // entrance slide plays from nowhere — the maximized overlay is the
  // only visible first paint, and minimize folds / navigation hooks
  // stay functional. Plain loads slide in from the top as before.
  const linkedWindowTarget =
    !!location.hash || new URLSearchParams(location.search).has("post");
  applyDirection(linkedWindowTarget ? "parked" : "down");

  const original = history.pushState.bind(history);
  originalPushState = history.pushState;
  history.pushState = (data, unused, url) => {
    if (url != null) {
      const target = new URL(url, location.href);
      if (target.pathname !== current) {
        transition(target.pathname, target.hash);
        if (target.hash) scrollToHash(target.hash);
      } else if (target.hash && target.hash !== location.hash) {
        // Same pathname, new hash: no page transition — scroll instead.
        scrollToHash(target.hash);
      }
    }
    original(data, unused, url);
  };
  // Same-page hyperlinks to hash elements change the hash natively.
  window.addEventListener("hashchange", (event) =>
    scrollToHash(new URL(event.newURL).hash),
  );
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
