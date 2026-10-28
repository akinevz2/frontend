import assert from "node:assert/strict";
import { test } from "node:test";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
// The exact schema the real pipeline uses (src/lib/markdown.tsx) — no
// local mirror that could drift from it.
import { sanitizeSchema } from "../src/lib/sanitizeSchema.ts";

const processor = unified()
  .use(remarkParse)
  .use(remarkBreaks)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeSanitize, sanitizeSchema);

function process(md) {
  return processor.runSync(processor.parse(md));
}

function collect(node, tagName, acc = []) {
  if (!node || typeof node !== "object") return acc;
  if (node.tagName === tagName) acc.push(node);
  for (const child of node.children ?? []) collect(child, tagName, acc);
  return acc;
}

function textOf(nodes) {
  const walk = (node, acc = []) => {
    if (node?.type === "text") acc.push(node.value);
    for (const child of node?.children ?? []) walk(child, acc);
    return acc.join("");
  };
  return nodes.map((node) => walk(node)).join(" | ");
}

test("GFM pipe tables render through the Md pipeline", () => {
  const md = [
    "\n\n| Recipe | Effect |",
    "|---|---|",
    "| `install` | full host setup |",
    "| `wm` -> `herbst` | stows `herbst` + `herbstclient reload` |",
    "\n\n",
  ].join("\n");
  const tree = process(md);
  const tables = collect(tree, "table");
  assert.equal(tables.length, 1);
  assert.equal(collect(tree, "thead").length, 1);
  assert.equal(collect(tree, "tr").length, 3);
  assert.equal(collect(tree, "th").length, 2);
  assert.equal(collect(tree, "td").length, 4);
  // inline code survives inside cells
  assert.equal(collect(tree, "code").length, 5);
});

test("remarkBreaks does not inject <br> between table rows", () => {
  const md = "| a | b |\n|---|---|\n| x | y |\n\n";
  const tables = collect(process(md), "table");
  assert.equal(tables.length, 1);
  // every br that remarkBreaks produces must stay outside table cells
  const row = collect(tables[0], "tr").pop();
  assert.equal(collect(row, "br").length, 0);
});

test("removal check: sanitize keeps tables but strips alignment/style", () => {
  const md =
    "| a | b |\n|:--|--:|\n| x | y |\n\n" + // alignment colons
    "<style>body{}</style>\n\n";
  const tree = process(md);
  assert.equal(collect(tree, "table").length, 1);
  // <style> is sanitized away
  assert.deepEqual(collect(tree, "style"), []);
  for (const cell of [...collect(tree, "th"), ...collect(tree, "td")]) {
    // no inline-style smuggling (align survives the whitelist — the
    // content-table CSS overrides it, so it is inert either way)
    assert.equal(cell.properties.style, undefined);
    assert.ok(
      ["left", "center", "right", undefined].includes(cell.properties.align),
    );
  }
});

test("line-oriented writing still breaks outside tables (remarkBreaks)", () => {
  const tree = process("line one\nline two\n\n");
  const paragraphs = collect(tree, "p");
  assert.equal(paragraphs.length, 1);
  assert.equal(collect(paragraphs[0], "br").length, 1);
  // and the two lines are kept apart by that break
  assert.match(textOf(paragraphs), /line one/);
  assert.match(textOf(paragraphs), /line two/);
});
