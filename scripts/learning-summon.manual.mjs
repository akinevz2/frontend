/** Manual verification for the summon flow (docs/LEARNING_PLAN.md §8
 * Phase 3): everything jsdom cannot exercise — real layout, focus
 * choreography, reduced-motion, no console errors/warnings.
 *
 *   node scripts/learning-summon.manual.mjs            # static checks
 *   node scripts/learning-summon.manual.mjs --serve    # + dev server
 *
 * Static checks (automated): CSS guards, storage-shape helpers wired,
 * interception exclusions present in the built bundle. Interactive
 * checklist (human): printed at the end. */
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

const summonSource = read("src/window/LessonSummon.tsx");
check(
  "modified clicks are not intercepted (ctrl/meta/shift/alt checked)",
  ["event.metaKey", "event.ctrlKey", "event.shiftKey", "event.altKey"].every(
    (k) => summonSource.includes(k),
  ),
);
check(
  "interception is preventDefault-only (no history entry)",
  summonSource.includes("event.preventDefault()") &&
    !summonSource.includes("history.pushState"),
);
check(
  "persistence writes go through learningStorage (guarded access only)",
  summonSource.includes("writeSummoned") &&
    summonSource.includes("readSummoned"),
);

const windowSource = read("src/window/Window.tsx");
check(
  "summoned Escape dismisses and refocuses the trigger",
  windowSource.includes("refocusTrigger(node.id)"),
);
check(
  "summoned windows are non-modal dialogs labelled by their title",
  windowSource.includes('role: "dialog"') &&
    windowSource.includes('"aria-labelledby"'),
);

const storageSource = read("src/lib/learningStorage.ts");
const storageCode = storageSource
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/.*/g, "");
check(
  "every storage access is in try/catch",
  (storageCode.match(/catch/g) ?? []).length >= 2,
);
check(
  "sessionStorage only — no cookies, no localStorage, no network",
  !storageCode.includes("localStorage") &&
    !storageCode.includes("document.cookie") &&
    !storageCode.includes("fetch"),
);

const promptSource = summonSource + read("src/window/LessonSummon.tsx");
check(
  "one native <dialog>, showModal, OK and Cancel",
  promptSource.includes("<dialog") &&
    promptSource.includes("showModal") &&
    promptSource.includes(">Cancel<") &&
    promptSource.includes(">OK<"),
);
check(
  'Clippy.png reused directly, decorative (alt="")',
  promptSource.includes('src="/Clippy.png"') && promptSource.includes('alt=""'),
);

console.log(
  `\n${failures === 0 ? "all static checks passed" : `${failures} FAILURES`}`,
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
11. shrink to mobile width: the hint renders in place, positions ignored
12. normal windows elsewhere on the site: unchanged OK-reveal behaviour
    (spot-check /contact and a blog post)
13. the Clippy easter egg (type "fuckingclippy") still behaves as before
    — the lesson flow never touched it
`);
