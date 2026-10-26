/** Scrolls the named element into view — inside its scrolling window (a
 * maximized window scrolls its own revealed content) or the page. A
 * target already fully on screen is left exactly where it is: the
 * landing scroll exists to reveal an off-screen section, so yanking a
 * visible one to the top row would only scramble the reader's place.
 * The element can mount after the route commit (lazy pages), and the
 * fresh page's height GROWS around the arrival (lazy embeds, images) —
 * an early scroll into a document still shorter than the target is
 * clamped to the top by the browser. So the landing re-aims on every
 * tick while it may have missed: as soon as the element mounts off
 * screen it gets aimed at, and the loop stops the moment the layout
 * settles with it on screen.
 *
 * Lives in lib (not in the pageSlide theme) because two owners aim
 * landings: the theme — every hash navigation, boot, popstate and the
 * alias re-land — and the window system, whose dismissals of SEEDED
 * maximized landings (a permalink opened the section maximized; the OK
 * press minimized it into the page) are the reader's arrival at the
 * section's inline resting place. */
export function scrollToId(id: string, attempts = 12): void {
  if (!id) return;
  const tick = (left: number) => {
    const el = document.getElementById(id);
    if (!el) {
      // The element can mount after the route commit (lazy pages).
      if (left > 0) window.setTimeout(() => tick(left - 1), 100);
      return;
    }
    // Maximized windows are viewport-fixed overlays; scrolling the page
    // behind them just resets the background while the overlay hides
    // it. The restored window scrolls itself to the target on dismissal
    // instead.
    if (!el.closest(".maximized-backdrop")) {
      const rect = el.getBoundingClientRect();
      if (rect.top < 0 || rect.bottom > window.innerHeight) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        // The aim may have been clamped (the document was shorter than
        // the target's position): keep aiming until it sticks.
        if (left > 0) window.setTimeout(() => tick(left - 1), 100);
        return;
      }
    }
  };
  tick(attempts);
}
