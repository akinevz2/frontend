/* Drives chrome-headless-shell (playwright cache binary, no packages)
 * over CDP with node's built-in WebSocket: loads the page with JS on,
 * captures console errors/warnings, then clicks an OK button and
 * compares the revealed content with the static snapshot text. */
import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const CHROME =
  os.homedir() +
  "/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell";

const url = process.argv[2] ?? "http://127.0.0.1:8086/";
const userDir = fs.mkdtempSync(path.join(os.tmpdir(), "chrome-seo-"));

const proc = execFile(CHROME, [
  "--headless",
  "--no-sandbox",
  "--disable-gpu",
  "--remote-debugging-port=0",
  `--user-data-dir=${userDir}`,
  "--dump-dom-off",
  url,
]);

// read the ws endpoint from stderr
const wsUrl = await new Promise((resolve, reject) => {
  let buf = "";
  proc.stderr.on("data", (d) => {
    buf += d;
    const m = buf.match(/ws:\/\/[^\s]+/);
    if (m) resolve(m[0]);
  });
  proc.on("exit", () => reject(new Error(buf.slice(0, 2000))));
  setTimeout(
    () => reject(new Error("no ws endpoint: " + buf.slice(0, 2000))),
    10000,
  );
});
// the page target: list targets (the /json endpoints hang off the host root)
const httpBase = wsUrl.match(/ws:\/\/([^/]+)/)[1];
const listRes = await fetch(`http://${httpBase}/json/list`);
const targets = await listRes.json();
const page = targets.find((t) => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);

let id = 0;
const pending = new Map();
const console_ = [];
const send = (method, params = {}) =>
  new Promise((resolve) => {
    const msgId = ++id;
    pending.set(msgId, resolve);
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg.result ?? msg.error);
    pending.delete(msg.id);
  } else if (msg.method === "Runtime.consoleAPICalled") {
    const text = msg.params.args
      .map((a) => a.value ?? a.description ?? "")
      .join(" ");
    console_.push([msg.params.type, text]);
  } else if (msg.method === "Log.entryAdded") {
    console_.push([msg.params.entry.level, msg.params.entry.text]);
  } else if (msg.method === "Runtime.exceptionThrown") {
    console_.push(["exception", msg.params.exceptionDetails.text ?? ""]);
  }
};

await new Promise((r) => (ws.onopen = r));
await send("Runtime.enable");
await send("Log.enable");
await send("Page.enable");
await send("Page.navigate", { url });
await new Promise((r) => setTimeout(r, 5000));

const report = await send("Runtime.evaluate", {
  expression: `(() => {
    const doc = document;
    const snapshot = doc.querySelector("main[data-seo-snapshot]");
    const buttons = [...doc.querySelectorAll('button[data-window-id][aria-controls]')];
    const first = buttons[0];
    const ariaBefore = first ? {expanded: first.getAttribute("aria-expanded"), controls: first.getAttribute("aria-controls")} : null;
    const targetId = first?.getAttribute("aria-controls");
    const before = targetId ? doc.getElementById(targetId)?.textContent?.slice(0, 80) : null;
    first?.click();
    first?.setAttribute("data-boot-marker", "clicked");
    return {
      windows: doc.querySelectorAll(".window").length,
      titleBars: [...doc.querySelectorAll(".title-bar-text")].slice(0,3).map(e=>e.textContent),
      snapshotStillThere: Boolean(snapshot),
      okButtons: buttons.length,
      ariaBefore,
      targetTextBefore: before,
      title: doc.title,
    };
  })()`,
  returnByValue: true,
});
console.log("page state:", JSON.stringify(report?.result?.value, null, 1));

const after = await send("Runtime.evaluate", {
  expression: `(() => {
    const target = document.getElementById("0.1");
    return {
      windowStillThere: Boolean(target),
      windowText: target?.textContent?.slice(0, 200) ?? null,
      windowChildren: target?.querySelectorAll("li").length ?? 0,
      okButtonGoneWhenExpanded: !document.querySelector('button[data-boot-marker]'),
    };
  })()`,
  returnByValue: true,
});
console.log("after click:", JSON.stringify(after?.result?.value, null, 1));
await new Promise((r) => setTimeout(r, 1500));
console.log("console/log entries:", console_.length);
for (const [kind, text] of console_.slice(0, 12))
  console.log(`  [${kind}] ${text.slice(0, 240)}`);
proc.kill();
ws.close();
