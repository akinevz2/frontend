import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";

/** A fresh DOM per test: the reveal scenarios mutate the tree (an OK
 *  unmounts), and the module holds cross-test state (lastSection). */
function setup() {
  const dom = new JSDOM(
    `<!doctype html>
    <nav class="menu-bar">
      <a role="menuitem" href="/blog">blog</a>
      <a role="menuitem" href="/resume">resume</a>
    </nav>
    <main class="page">
      <div class="window" id="w1">
        <div class="title-bar">
          <button aria-label="Minimize">min</button>
          <button aria-label="Close">x</button>
        </div>
        <div class="window-body">
          <button id="ok">OK</button>
          <a href="/blog/post" id="post-link">read more</a>
          <button disabled id="dead">dead</button>
          <input id="query" type="text" />
        </div>
      </div>
      <div class="window" id="w2">
        <div class="window-body">
          <button id="ok-2">OK</button>
        </div>
      </div>
    </main>`,
    { url: "https://akinevz.com/" },
  );
  const { document } = dom.window;
  globalThis.document = document;
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.Node = dom.window.Node;
  globalThis.getComputedStyle = dom.window.getComputedStyle;
  // jsdom implements no layout: every element reports one rect unless
  // it opts out via data-hidden.
  document.querySelectorAll("*").forEach((el) => {
    el.getClientRects = () => (el.hasAttribute("data-hidden") ? [] : [{}]);
  });
  return document;
}

const tabNavModule = () => import("../src/lib/tabNav.ts");

const ids = (stops) => stops.map((el) => el.id || el.textContent);

test("tabNav: menu first, page buttons after, decorations skipped", async () => {
  const document = setup();
  const { tabStops } = await tabNavModule();
  assert.deepEqual(ids(tabStops()), [
    "blog",
    "resume",
    "ok",
    "post-link",
    "query",
    "ok-2",
  ]);
});

test("tabNav: after a section is revealed, Tab anchors INSIDE it, Shift+Tab before it", async () => {
  const document = setup();
  const { focusNextStops, installTabNavigation, resetSectionAnchor } =
    await tabNavModule();
  const unmount = installTabNavigation();
  resetSectionAnchor();
  // The user CLICKS the OK button: the focusin listener records the
  // section, then the button unmounts (the section reveals) and focus
  // falls to the body.
  document.getElementById("ok").focus();
  document.getElementById("ok").remove();
  // Tab: the first stop of the revealed section (the subsequent stop).
  const forward = focusNextStops(false);
  assert.equal(forward.id, "post-link");
  // Shift+Tab: the stop BEFORE the section (the previous stop) — the
  // menu bar's last item.
  const backward = focusNextStops(true);
  assert.equal(backward.textContent, "resume");
  unmount();
});

test("tabNav: focus wraps menu -> page -> menu", async () => {
  const document = setup();
  const { focusNextStops } = await tabNavModule();
  const menu = [...document.querySelectorAll(".menu-bar a[role='menuitem']")];
  menu[0].focus();
  const next = focusNextStops(false);
  assert.equal(next.textContent, "resume");
  const pageStop = focusNextStops(false);
  assert.equal(pageStop.id, "ok");
  // From the last page stop, wrap back to the first menu item.
  document.getElementById("ok-2").focus();
  const wrapped = focusNextStops(false);
  assert.equal(wrapped.textContent, "blog");
  // Backwards from the first menu item wraps to the last page stop.
  menu[0].focus();
  const back = focusNextStops(true);
  assert.equal(back.id, "ok-2");
});

test("tabNav: the keydown handler prevents default and stops", async () => {
  const document = setup();
  const { onTabKey } = await tabNavModule();
  const events = [];
  const event = {
    key: "Tab",
    shiftKey: false,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    target: document.getElementById("ok"),
    preventDefault: () => events.push("preventDefault"),
  };
  onTabKey(event);
  assert.deepEqual(events, ["preventDefault"]);
});

test("tabNav: text fields keep the browser's native Tab", async () => {
  const document = setup();
  const { onTabKey } = await tabNavModule();
  const events = [];
  const event = {
    key: "Tab",
    shiftKey: false,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    target: document.getElementById("query"),
    preventDefault: () => events.push("preventDefault"),
  };
  onTabKey(event);
  assert.deepEqual(events, []);
});
