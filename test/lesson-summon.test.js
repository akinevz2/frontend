/** The summon-flow tests (docs/LEARNING_PLAN.md §8 Phase 3): the pure
 * fragment-interception decision, and the DOM flow jsdom allows —
 * trigger click → Clippy prompt → OK summons the hint window (focused,
 * with its stored position) → Escape dismisses and clears the session
 * entry. The pointer/drag/manual flows live in
 * scripts/learning-summon.manual.mjs. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import React, { useRef, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { summonTargetOf, LessonSummon } from "../src/window/LessonSummon.tsx";
import { PageWindows } from "../src/window/index.ts";
import { WindowProvider } from "../src/window/state.tsx";
import { SignalProvider } from "../src/lib/signals.tsx";

const HINTS = new Set(["include-by-path", "the-hint"]);

test("a plain fragment naming a hint on the page is intercepted", () => {
  assert.equal(summonTargetOf("#include-by-path", HINTS), "include-by-path");
});

test("foreign fragments and non-fragment hrefs pass; the Clippy link never summons", () => {
  assert.equal(summonTargetOf("#no-such-hint", HINTS), undefined);
  assert.equal(summonTargetOf("/blog/other", HINTS), undefined);
  assert.equal(summonTargetOf(null, HINTS), undefined);
  assert.equal(summonTargetOf("##clippy", HINTS), undefined);
});

test("percent-escaped fragments decode before the id lookup", () => {
  assert.equal(
    summonTargetOf(
      "#its%20in%20the%20registry",
      new Set(["its in the registry"]),
    ),
    "its in the registry",
  );
});

/* ---------------------------------------------------- the DOM flow */

const dom = new JSDOM(
  '<!doctype html><html><body><div id="root"></div></body></html>',
  {
    url: "https://akinevz.com/learning/lesson-template",
    pretendToBeVisual: true,
  },
);
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.sessionStorage = dom.window.sessionStorage;
globalThis.location = dom.window.location;
globalThis.history = dom.window.history;
globalThis.History = dom.window.History;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.HTMLAnchorElement = dom.window.HTMLAnchorElement;
globalThis.HTMLDialogElement = dom.window.HTMLDialogElement;
globalThis.KeyboardEvent = dom.window.KeyboardEvent;
globalThis.MouseEvent = dom.window.MouseEvent;
globalThis.Element = dom.window.Element;
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(
  dom.window,
);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(
  dom.window,
);
globalThis.HTMLElement = dom.window.HTMLElement;

const LESSON = {
  heading: "Lesson",
  anchor: "lesson",
  theme: "open",
  content: [
    "[need a hint?](#my-hint)",
    {
      heading: "my hint",
      kind: "hint",
      anchor: "my-hint",
      content: "hint body",
    },
  ],
};

function Harness() {
  const ref = useRef(null);
  return h(
    "div",
    { ref, className: "lesson" },
    h(
      WindowProvider,
      { roots: [LESSON] },
      h(
        PageWindows,
        { content: LESSON },
        h(LessonSummon, { containerRef: ref }),
      ),
    ),
  );
}

test("trigger click opens the prompt; OK summons; Escape dismisses", async () => {
  sessionStorage.clear();
  const container = dom.window.document.getElementById("root");
  const root = createRoot(container);
  // React renders concurrently: poll rather than sleep, so the test is
  // robust under the parallel test runner's load.
  const waitFor = async (what, probe) => {
    for (let i = 0; i < 100; i++) {
      const value = probe();
      if (value) return value;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    assert.ok(false, `timed out waiting for ${what}`);
  };
  root.render(h(SignalProvider, null, h(Harness)));
  const hintWindow = await waitFor("the hint window", () =>
    container.querySelector('.window[data-kind="hint"]'),
  );
  assert.equal(hintWindow.classList.contains("summoned"), false);

  // The trigger click: intercepted, no navigation.
  const trigger = await waitFor("the trigger link", () =>
    container.querySelector('a[href="#my-hint"]'),
  );
  trigger.dispatchEvent(
    new dom.window.MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      button: 0,
    }),
  );

  // The interceptor is a passive effect: under a loaded scheduler it
  // can land a tick after the trigger link paints. Retry the click —
  // interception is idempotent (one prompt state; an already-summoned
  // hint just focuses).
  let dialog = container.querySelector("dialog.clippy-prompt");
  for (let i = 0; !dialog && i < 10; i++) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    trigger.dispatchEvent(
      new dom.window.MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        button: 0,
      }),
    );
    dialog = container.querySelector("dialog.clippy-prompt");
  }
  assert.ok(dialog, "the Clippy <dialog> opened");
  assert.ok(
    dialog.textContent.includes("it looks like you're reading about my hint"),
    "the dialogue names the hint heading",
  );

  // OK: the hint summons — same window node, now floating (summoned).
  const ok = [...dialog.querySelectorAll("button")].find(
    (b) => b.textContent === "OK",
  );
  ok.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  await waitFor("the summon", () => hintWindow.classList.contains("summoned"));
  assert.ok(
    hintWindow.getAttribute("aria-labelledby"),
    "labelled by its title",
  );
  await waitFor("the persisted summon", () =>
    sessionStorage
      .getItem("learning:/learning/lesson-template")
      ?.includes("my-hint"),
  );

  // Escape: dismiss, focus returns, storage cleared.
  dom.window.document.dispatchEvent(
    new dom.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
  );
  await waitFor(
    "the dismissal",
    () => hintWindow.classList.contains("summoned") === false,
  );
  await waitFor("the persisted dismissal", () => {
    try {
      const stored = JSON.parse(
        sessionStorage.getItem("learning:/learning/lesson-template") ?? "{}",
      );
      return Array.isArray(stored.summoned) && stored.summoned.length === 0;
    } catch {
      return false;
    }
  });

  root.unmount();
});
