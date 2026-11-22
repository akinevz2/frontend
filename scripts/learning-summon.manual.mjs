/** Manual verification for the summon flow (docs/LEARNING_PLAN.md §8
 * Phase 3): everything jsdom cannot exercise — real layout, focus
 * choreography, reduced-motion, no console errors/warnings.
 *
 *   node scripts/learning-summon.manual.mjs            # CSS checks
 *
 * The SOURCE-level guarantees (renderer boundary, node-builtin
 * confinement, sessionStorage purity, no-history-writes) are LINT
 * rules now (eslint.config.js — Phase 3.5): run `npm run lint`. What
 * remains here is the CSS-shape checking (eslint does not parse CSS)
 * and the interactive checklist. Behavioural coverage (storage
 * round-trips, the dialogue flow) lives in test/. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

let failures = 0;
const check = (name, ok) => {
  console.log(`${ok ? "ok" : "FAIL"} - ${name}`);
  if (!ok) failures++;
};

const learningCss = read("src/styles/learning.css");
check(
  "reduced-motion: the summon slide is disabled under prefers-reduced-motion",
  /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.window\.summoned \{\s*animation: none/.test(
    learningCss,
  ),
);
check(
  "stacked layout: summoned positions are ignored at the mobile breakpoint",
  /max-width: 768px[\s\S]*\.window\.summoned \{\s*position: static/.test(
    learningCss,
  ),
);
check(
  "no slide for restored hints (.summon-restore)",
  /\.window\.summon-restore \{\s*animation: none/.test(learningCss),
);

console.log(
  `\n${failures === 0 ? "all CSS checks passed" : `${failures} FAILURES`}`,
);

/* ------------------------------------------------ interactive checklist */

console.log(`
INTERACTIVE CHECKLIST (run: npm run dev, then visit /learning/lesson-template):

1. no console errors or React warnings on load, summon, dismiss, restore
2. clicking "need a hint?" opens the XP-styled prompt with Clippy.png;
   the address bar is UNCHANGED and back-button does nothing new
3. Cancel closes the prompt and focus returns to the trigger link
4. Escape in the prompt does the same (focus trap: Tab cycles inside)
5. OK summons the hint: it floats opposite the trigger's column, slides
   in, focus lands in it, the title bar carries the Clippy icon
6. clicking the trigger again while summoned: focus moves into it, NO
   duplicate window appears
7. Escape in the summoned window dismisses it; focus returns to trigger
8. the ✕ on the summoned window dismisses it too (no close sound, no
   park, no Clippy easter-egg bubble)
9. reload the page: the hint re-summons in the same spot WITHOUT the
   slide animation
10. sessionStorage key learning:/learning/<route> holds
    {"v":1,"summoned":[{id,x,y,z}]}; nothing in localStorage/cookies
11. shrink to mobile width: the hint renders in place, positions
    ignored, AND dragging is disabled (pointer and keyboard)
12. normal windows elsewhere on the site: unchanged OK-reveal behaviour
    (spot-check /contact and a blog post)
13. the Clippy easter egg (type "fuckingclippy") still behaves as before
    — the lesson flow never touched it

DRAGGING (§7.4):
14. pointer down on a summoned title bar raises it above any other
    summoned hint (z-order), persisted on drop
15. dragging moves the window smoothly (CSS vars, no jank/lag), clamped
    to the lesson container AND the viewport; releasing persists —
    reload restores the dropped spot
16. only the title bar drags: content, close button and edges do not;
    other summoned hints can be dragged independently
17. touch: the title bar scrolls nothing (touch-action: none) and the
    drag follows the finger; page scroll still works on the body
18. keyboard: Tab into the title bar, arrow keys move 16px, Shift+
    arrows 64px; the move instructions are announced (aria-describedby)
    and persisted; Escape still closes while the bar is focused
19. reduced-motion: no slide on summon/restore (dragging itself is
    pointer-driven and unaffected)
`);
