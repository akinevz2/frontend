import {
  applyTheme,
  clearThemeVariables,
  setTheme,
  type ThemeDefinition,
} from "lightdni-jssas-toggle";
import { playMinimizeClick } from "@/lib/audio";
import { windowBookmark } from "@/lib/history";
import { dispatchSignal } from "@/lib/signals";
import { scrollToId } from "@/lib/scrollTo";
import { resolveDirection, type Direction } from "./direction";
import "./pageSlide.css";

const CLASS = "theme-page-slide";
const ATTRIBUTE = "data-page-slide";
/** Two-part, one motion: the fold plays DURING the fall (zero delay -
 * the squish happens while the page moves downwards), the glide itself
 * stays gentle (ease-in-out off-screen). The gravity read lives in the
 * MAIN windows' fold curve (see the css: top-level folds ease-in,
 * nested children fold linearly so the parent's acceleration doesn't
 * compound through them). The glide is distance-aware (same pace for
 * every page size, clamped). */
const FOLD_MS = 200;
/** The pause between one main window FINISHING its fall and the next
 * BEGINNING: the clear beat the cascade reads by (zero-gap chaining was
 * invisible - the folds blurred into one motion). The step is the fold
 * plus this gap. */
const CASCADE_GAP_MS = 150;
const ARRIVAL_SPEED_PX_MS = 3.1;
const ARRIVAL_MIN_DURATION_MS = 520;
const ARRIVAL_MAX_DURATION_MS = 880;
const DROP_SPEED_PX_MS = 3.4;
const DROP_MIN_DURATION_MS = 480;
const DROP_MAX_DURATION_MS = 820;
const REMOVAL_MARGIN_MS = 200;
const arrivalDuration = (distancePx: number): number =>
  Math.round(
    Math.min(
      ARRIVAL_MAX_DURATION_MS,
      Math.max(ARRIVAL_MIN_DURATION_MS, distancePx / ARRIVAL_SPEED_PX_MS),
    ),
  );
const dropDuration = (distancePx: number): number =>
  Math.round(
    Math.min(
      DROP_MAX_DURATION_MS,
      Math.max(DROP_MIN_DURATION_MS, distancePx / DROP_SPEED_PX_MS),
    ),
  );
const VARIABLES = [
  "--ps-duration",
  "--ps-minimize",
  "--ps-drop-delay",
  "--ps-drop-dur",
  "--ps-drop-distance",
  "--ps-in-x",
  "--ps-in-y",
  "--ps-pad-from",
];

/** Where the new page starts, per direction. From above: the offset is
 * the page's OWN height plus a viewport - a bare -100vh only clears the
 * first viewport of a tall page, so its mid-page band (windows included)
 * sat inside the viewport at animation start. -100% (translate % = the
 * element's own height) puts the whole page above the screen; the extra
 * viewport is runway. */
const START: Record<Direction | "parked", [string, string]> = {
  right: ["100vw", "0"],
  left: ["-100vw", "0"],
  down: ["0", "calc(-100% - 100vh)"],
  // Initial load ONTO a hyperlinked window target: the theme is fully
  // installed (its class drives the minimize folds and navigation hooks)
  // but the entrance is zero-distance - nothing visibly moves while the
  // reveal scrolls to the linked section.
  parked: ["0", "0"],
};

/** The per-transition durations: the arrival's, the drop's, and the
 * cascade tail (the drop may not begin until the last window's fold has
 * finished - the tail is that wait). */
interface SlideScale {
  arrivalMs: number;
  dropMs: number;
  tailMs: number;
}

const slide = (
  name: string,
  inX: string,
  inY: string,
  scale: SlideScale,
): ThemeDefinition => ({
  className: CLASS,
  attributes: { [ATTRIBUTE]: name },
  variables: {
    "--ps-duration": `${scale.arrivalMs}ms`,
    "--ps-minimize": `${FOLD_MS}ms`,
    "--ps-drop-delay": `${scale.tailMs}ms`,
    "--ps-drop-dur": `${scale.dropMs}ms`,
    "--ps-in-x": inX,
    "--ps-in-y": inY,
  },
});

const themeFor = (
  name: Direction | "parked",
  scale: SlideScale,
): ThemeDefinition => slide(name, START[name][0], START[name][1], scale);

const root = () => document.documentElement;
const applyDirection = (themeName: Direction | "parked", scale: SlideScale) =>
  setTheme({
    themeName,
    themes: { [themeName]: themeFor(themeName, scale) },
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
function leaveGhost(): SlideScale {
  root().style.removeProperty("--ps-pad-from");
  root().style.removeProperty("--ps-drop-distance");
  const main = document.querySelector("main");
  if (!main) {
    return { arrivalMs: ARRIVAL_MIN_DURATION_MS, dropMs: DROP_MIN_DURATION_MS, tailMs: 0 };
  }
  // Measure the LIVE layout first - the detached clone reports zero-size
  // boxes, which is what used to blank the placeholders and collapse
  // windows instantly. querySelectorAll order is stable across cloneNode.
  const liveMedias = [...main.querySelectorAll("iframe, audio, video")];
  const mediaBoxes = liveMedias.map((el) => el.getBoundingClientRect());

  const rect = main.getBoundingClientRect();
  // The drop distance is measured, not fixed: the ghost's TOP edge must
  // pass the viewport bottom, which is 100vh MINUS the old page's scroll
  // offset (rect.top goes negative as the page scrolls) - plus margin to
  // clear the folded sliver. A fixed 110vh left the ghost's tail on
  // screen whenever the old page was scrolled down.
  const exitDistance =
    window.innerHeight - rect.top + window.innerHeight * 0.1;
  root().style.setProperty(
    "--ps-drop-distance",
    `${Math.round(exitDistance)}px`,
  );
  // The exit's drop duration derives from the measured distance (one
  // pace for every page size) and is set BEFORE the ghost attaches, so
  // its animation starts at its final timing; applyDirection re-states
  // the same values through the theme right after - a no-op on the
  // running animation. The fold beat (FOLD_MS) is a constant.
  const dropMs = dropDuration(exitDistance);
  root().style.setProperty("--ps-drop-dur", `${dropMs}ms`);
  root().style.setProperty("--ps-minimize", `${FOLD_MS}ms`);
  const ghost = main.cloneNode(true) as HTMLElement;
  ghost.classList.add("page-slide-ghost");
  Object.assign(ghost.style, {
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    minHeight: "0",
  });
  const pageEl = main.matches(".page")
    ? main
    : main.querySelector<HTMLElement>(".page");
  const ghostPage = ghost.matches(".page")
    ? ghost
    : ghost.querySelector<HTMLElement>(".page");
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
    // The MAINTAIN pass: a placeholder NEVER shows the bare page
    // background - the blank flash reported inside expanded sections
    // during the fall. It takes the owning window's paper (the section
    // keeps its surface); document frames that carry their own opaque
    // background (the white resume preview) keep it.
    const ownBg = live ? getComputedStyle(live).backgroundColor : "";
    const hasOwnBg =
      !!ownBg && ownBg !== "transparent" && ownBg !== "rgba(0, 0, 0, 0)";
    const owner = live?.closest(".window-body") ?? live?.closest(".window");
    const paper = owner ? getComputedStyle(owner).backgroundColor : "";
    const hasPaper =
      !!paper && paper !== "transparent" && paper !== "rgba(0, 0, 0, 0)";
    placeholder.style.backgroundColor = hasOwnBg
      ? (ownBg ?? "")
      : hasPaper
        ? (paper ?? "")
        : "";
    el.replaceWith(placeholder);
  });
  // XP-style minimise: the ghost's windows squash IN PLACE (CSS handles
  // the scaleY; no per-window fold distance is measured - the old
  // translateY-to-the-taskbar-line fold teleported top-of-page windows
  // below the arriving page before sliding out). The whole-page drop
  // carries every window out from where it sits.
  // THE CASCADE: the top-level windows fall ONE AT A TIME. Each main
  // window squashes AND FALLS to the taskbar line (its own measured
  // distance), raised above every not-yet-falling window while it does;
  // the next one begins CASCADE_GAP_MS after the previous has FINISHED.
  // Nested windows carry no fall of their own (the custom property is
  // reset on descendants in css) - they squash in the parent's stage
  // and ride the parent's fall. The page's gentle glide waits for the
  // whole cascade: the drop delay is the cascade tail.
  const taskbarLine = window.innerHeight;
  const step = FOLD_MS + CASCADE_GAP_MS;
  const topLevel = ".page > .window, .page > .maximized-shell > .window";
  const liveWins = [...main.querySelectorAll<HTMLElement>(topLevel)];
  ghost.querySelectorAll<HTMLElement>(topLevel).forEach((win, i) => {
    const liveWin = liveWins[i];
    if (!liveWin) return;
    // the fall: the window's bottom edge to the taskbar line
    const fall = Math.max(
      0,
      taskbarLine - liveWin.getBoundingClientRect().bottom,
    );
    win.style.setProperty("--page-fold-dy", `${Math.round(fall)}px`);
    win.style.setProperty(
      "--ps-fold-delay",
      `${Math.round(i * step)}ms`,
    );
    // the falling window rides OVER the rest while it falls
    win.style.position = "relative";
    win.style.zIndex = `${100 - i}`;
  });
  const tailMs =
    Math.max(0, liveWins.length - 1) * step + (liveWins.length ? FOLD_MS : 0);
  root().style.setProperty("--ps-drop-delay", `${tailMs}ms`);
  const removalMs = tailMs + dropMs + REMOVAL_MARGIN_MS;
  document.body.appendChild(ghost);
  // Maximized overlays ride INSIDE the ghost now (they are in-tree), so
  // the dimmed layer and the maximized window fold and drop with the
  // page - no portal ride-out is needed on navigation.
  document.querySelectorAll<HTMLElement>("body > .debug-bar").forEach((bar) => {
    // A bar hidden by the maximized overlay rides nothing: cloning it
    // only paints a flash after the unlock (the folded ghost unparks
    // body:has while the ride is still alive).
    if (getComputedStyle(bar).display === "none") return;
    const leaving = bar.cloneNode(true) as HTMLElement;
    leaving.classList.add("page-slide-bar");
    // Layout rules key off this attribute; the clone must not keep them alive.
    delete leaving.dataset.debugBar;
    document.body.appendChild(leaving);
    // The live bar yields to the clone in the same frame - visibility,
    // not display, so the body padding rules keep reserving its row -
    // and the clone drops (and fades) with the page instead of the bar
    // blinking out at the route commit.
    bar.classList.add("page-slide-bar-hide");
    window.setTimeout(() => {
      leaving.remove();
      bar.classList.remove("page-slide-bar-hide");
    }, removalMs);
  });
  const remove = (event?: Event) => {
    // Child windows bubbling their minimise-end must NOT retire the ghost -
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
  window.setTimeout(() => remove(), removalMs);
  // The arrival's distance uses the OLD page's height as the estimate of
  // the new page's (the route has not rendered yet); both durations
  // derive from their own speeds.
  return {
    arrivalMs: arrivalDuration(rect.height + window.innerHeight),
    dropMs,
    tailMs,
  };
}

let current = "";
let originalPushState: History["pushState"] | null = null;
let originalReplaceState: History["replaceState"] | null = null;
/** Mutes the next transition's fold click: the navigating window X
 * (close) declares its own Click.ogg through the bus (closeSounds) - no
 * second click on top of the navigation fold. */
let clickSuppressed = false;

export function suppressNextSlideClick(): void {
  clickSuppressed = true;
}

/** On mobile screens the appearing page always slides straight down
 * (from above) - the side-by-side menu-order metaphor doesn't read on
 * a narrow, wrapped menu. Matches the layout.css 768px breakpoint. */
const isMobileLayout = () => window.matchMedia("(max-width: 768px)").matches;

function transition(to: string, hash: string): void {
  if (to === current) return;
  // The committed navigation rides the signal bus as a notice -
  // monitoring handlers subscribe; the choreography itself stays here.
  dispatchSignal("page:navigated", { from: current, to });
  if (clickSuppressed) clickSuppressed = false;
  else playMinimizeClick();
  const direction = isMobileLayout()
    ? "down"
    : resolveDirection(current, to, menuOrder());
  const scale = leaveGhost();
  applyDirection(direction, scale);
  restartArrival();
  current = to;
  // A new page starts at the top - unless the url carries a hash, whose
  // element the navigation scrolls itself to (scrollToHash).
  if (!hash) window.scrollTo({ top: 0 });
}

/** Restart the just-applied destination slide so it runs in step with the
 * exit choreography (fold + drop happen while the page slides in). The
 * forced style flush between "none" and "" is REQUIRED: without it both
 * writes resolve in one style pass, the CSS animation never restarts, and
 * a same-direction navigation (every mobile move - mobile is always
 * "down") pops the new page in with no slide at all. */
function restartArrival(): void {
  const main = document.querySelector("main");
  if (!main) return;
  main.style.animation = "none";
  void main.offsetWidth;
  main.style.animation = "";
  // The page element is main itself in the normalized shell (main.page):
  // a nested .page resets separately, in whatever shape the document has.
  const page = main.matches(".page")
    ? null
    : main.querySelector<HTMLElement>(".page");
  if (page) {
    page.style.animation = "none";
    void page.offsetWidth;
    page.style.animation = "";
  }
}

const onPopState = () => {
  const arrival = { path: location.pathname, hash: location.hash };
  if (location.pathname === current) {
    // Same-page history traversal only moves the shape of the URL:
    // bring the hyperlinked element into view (inside its scrolling
    // window) - and announce the RETURN, so holders of pre-departure
    // state (the window store, same-path traversals never remount) can
    // repair themselves.
    if (location.hash) scrollToHash(location.hash);
    // A hash-free bookmarked destination names its section in STATE:
    // the same landing rule.
    else scrollToId(windowBookmark() ?? "");
    dispatchSignal("page:returned", arrival);
    return;
  }
  transition(location.pathname, location.hash);
  if (location.hash) scrollToHash(location.hash);
  // A hash-free bookmarked return (the window departures' form - the
  // entry names its section in STATE alone): land on it like any hash
  // target. The reveal is the store's; the landing scroll is ours.
  else scrollToId(windowBookmark() ?? "");
  // History traversal onto another page keeps the same rule: a hashed
  // window target lands on its element (the reveal is the store's),
  // and the traversal is announced as a return.
  dispatchSignal("page:returned", arrival);
};

/** Scrolls the hash element into view - the aim implementation lives in
 * @/lib/scrollTo, shared with the window system's dismissal landings. */
function scrollToHash(hash: string, attempts = 12): void {
  const id = decodeURIComponent(hash.slice(1));
  scrollToId(id, attempts);
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
  // ?post= the route reveals): install the theme "parked" so the
  // entrance slide plays from nowhere, then land the page on the target
  // - the return-to-page choreography (the reveal is the window store's,
  // the landing scroll is this theme's, like every hash navigation).
  // Minimize folds / navigation hooks stay functional. Plain loads slide
  // in from the top as before.
  const linkedWindowTarget =
    !!location.hash ||
    new URLSearchParams(location.search).has("post") ||
    // A returned-to entry may name its section in STATE alone (the
    // off-site bookmark is hash-free by design): that arrival is a
    // landing on a target too - parked, reveal + scroll, nothing moves.
    !!windowBookmark();
  // The boot scale measures the landing page (main exists by now): the
  // initial plain load slides in from above at the same speed every
  // navigation uses.
  const bootMain = document.querySelector("main");
  const bootScale: SlideScale = {
    arrivalMs: arrivalDuration(
      (bootMain?.getBoundingClientRect().height ?? window.innerHeight) +
        window.innerHeight,
    ),
    dropMs: dropDuration(window.innerHeight * 1.1),
    tailMs: 0,
  };
  applyDirection(linkedWindowTarget ? "parked" : "down", bootScale);
  if (linkedWindowTarget) {
    if (location.hash) scrollToHash(location.hash);
    // A hash-free bookmarked target (the off-site return's form): the
    // entry names its section in STATE alone - land on it the same way
    // the hash form lands.
    else scrollToId(windowBookmark() ?? "");
  }

  const original = history.pushState.bind(history);
  originalPushState = history.pushState;
  /** Set inside the pushState wrapper when a same-path commit
   * re-addresses the content: the announcement dispatches only after
   * the original pushState has committed, so repair handlers read the
   * NEW address. */
  let samePathReaddress = false;
  history.pushState = (data, unused, url) => {
    if (url != null) {
      const target = new URL(url, location.href);
      if (target.pathname !== current) {
        transition(target.pathname, target.hash);
        if (target.hash) scrollToHash(target.hash);
      } else if (
        (data as { window?: unknown } | null)?.window == null &&
        (target.search !== location.search || target.hash !== location.hash)
      ) {
        // Same-path CONTENT re-address: the router pushed a query or
        // hash that names a new target (?post=, #id) - announced AFTER
        // the commit below, so the repair reads the new address. The
        // window system's own anchor pushes carry the state bookmark
        // and stay silent (they are UI entries, not content addresses).
        samePathReaddress = true;
      }
      // Pure same-path pushes without a re-address stay silent: they
      // are UI history entries, NOT page arrivals - no landing scroll
      // exists for them. Hash landings for real arrivals come from the
      // boot branch, the popstate branches and hashchange.
    }
    original(data, unused, url);
    if (samePathReaddress) {
      samePathReaddress = false;
      dispatchSignal("page:addressed", {
        path: location.pathname,
        hash: location.hash,
      });
    }
  };
  // The ALIAS re-land: a shorthand path (/addons) boots as its own
  // document and the router commits the destination (<Navigate
  // to="/wow#addons" replace>) with a replaceState - the only
  // path-changing commit the pushState wrapper cannot see. It is not a
  // traversal (nothing announces it; the fresh-arrival gate decides the
  // store's landing by the referrer alone) - but the page must still be
  // LANDED on the destination's hash element like every boot: aim the
  // scroll at it (the retrying scrollToId absorbs the remount delay),
  // and take over `current` so later pushes compare against the true
  // destination path. Same-path replaceStates (the window system's
  // bookmark writes) stay silent.
  const originalReplaceState = history.replaceState.bind(history);
  history.replaceState = (data, unused, url) => {
    if (url != null) {
      const target = new URL(url, location.href);
      if (target.pathname !== current) {
        current = target.pathname;
        if (target.hash) scrollToHash(target.hash);
        else scrollToId(windowBookmark() ?? "");
      }
    }
    originalReplaceState(data, unused, url);
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
  if (originalReplaceState) history.replaceState = originalReplaceState;
  originalReplaceState = null;
  window.removeEventListener("popstate", onPopState);
  applyTheme({}, { previousClassNames: [CLASS] });
  clearThemeVariables(VARIABLES);
  root().removeAttribute(ATTRIBUTE);
  document
    .querySelectorAll(".page-slide-ghost, .page-slide-bar")
    .forEach((el) => el.remove());
}
