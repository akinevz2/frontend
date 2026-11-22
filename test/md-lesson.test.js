/** The §5 markdown convention, unit-tested (docs/LEARNING_PLAN.md §8
 * Phase 2 acceptance): hint:/advice:/ref: headings at depth ≥ 2 open
 * nested Sections of that kind; the prefix is stripped from the
 * displayed heading; the anchor is the kebab-cased remainder; fenced
 * code blocks are never scanned; the BASE mdSection is untouched (blog
 * byte-identity depends on it). */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  lessonAnchor,
  lessonBlocks,
  mdLessonSection,
  mdSection,
} from "../src/renderer/index.ts";

test("plain headings stay prose; kind headings open nested sections", () => {
  const md = [
    "# The lesson",
    "intro line",
    "",
    "## Hint: include by path",
    "hint body",
    "",
    "## Some plain heading",
    "plain body",
    "",
    "## Advice: read the plan",
    "advice body",
    "",
    "## ref: further reading",
    "reference body",
  ].join("\n");
  const lesson = mdLessonSection("the-lesson", md);
  assert.equal(lesson.heading, "The lesson");
  assert.equal(lesson.theme, "open");
  assert.equal(lesson.flow, "diagonal");
  const content = lesson.content;
  assert.ok(Array.isArray(content));
  // intro prose, then the three kind windows interleaved with prose
  assert.equal(content[0], "intro line");
  const hint = content[1];
  assert.equal(hint.heading, "include by path");
  assert.equal(hint.kind, "hint");
  assert.equal(hint.anchor, "include-by-path");
  assert.ok(String(hint.content).includes("hint body"));
  // the plain heading stayed prose, prefix not stripped anywhere else
  assert.equal(content[2], "## Some plain heading\nplain body");
  const advice = content[3];
  assert.equal(advice.kind, "advice");
  const reference = content[4];
  assert.equal(reference.kind, "reference");
});

test("case-insensitive prefixes; ref: maps to the reference kind", () => {
  const lesson = mdLessonSection("s", "## REF: docs\ntext");
  assert.ok(Array.isArray(lesson.content));
  assert.equal(lesson.content[0].kind, "reference");
});

test("fenced code blocks are never scanned for headings", () => {
  const md = [
    "## Hint: the real one",
    "```md",
    "## hint: not a heading — code stays code",
    "~~~",
    "## advice: also code",
    "```",
    "still hint body",
  ].join("\n");
  const lesson = mdLessonSection("s", md);
  const content = lesson.content;
  assert.ok(Array.isArray(content));
  assert.equal(content.length, 1);
  const hint = content[0];
  assert.equal(hint.kind, "hint");
  assert.ok(String(hint.content).includes("## hint: not a heading"));
  assert.ok(String(hint.content).includes("## advice: also code"));
});

test("a deeper hint heading nests inside the current hint", () => {
  const md = [
    "## Hint: outer",
    "outer body",
    "### advice: inner",
    "inner body",
  ].join("\n");
  const lesson = mdLessonSection("s", md);
  const hint = lesson.content[0];
  assert.equal(hint.kind, "hint");
  const inner = hint.content[1]; // [0] is the "outer body" prose
  assert.equal(inner.kind, "advice");
  assert.equal(inner.heading, "inner");
  assert.equal(inner.anchor, "inner");
  assert.ok(String(inner.content).includes("inner body"));
});

test("the hint body ends at the next same-or-shallower heading", () => {
  const md = ["## hint: a", "body a", "## hint: b", "body b"].join("\n");
  const lesson = mdLessonSection("s", md);
  assert.equal(lesson.content.length, 2);
  assert.ok(String(lesson.content[0].content).includes("body a"));
  assert.ok(!String(lesson.content[0].content).includes("body b"));
});

test("lessonAnchor is deterministic and kebab-cased", () => {
  assert.equal(lessonAnchor("it's in the registry"), "it-s-in-the-registry");
  assert.equal(lessonAnchor("  --Two  words-- "), "two-words");
});

test("trigger links have real fragment hrefs that name hint anchors", () => {
  const md = ["[need a hint?](#the-hint)", "", "## Hint: the hint", "body"];
  const lesson = mdLessonSection("s", md.join("\n"));
  const hint = lesson.content[1]; // [0] is the trigger-link prose
  assert.equal(hint.kind, "hint");
  assert.equal(hint.anchor, "the-hint");
  assert.ok(md[0].includes("#the-hint"));
});

test("the BASE mdSection is untouched by the convention", () => {
  const md = [
    "# Blog post",
    "prose",
    "",
    "## hint: not a lesson — stays prose",
    "prose too",
  ].join("\n");
  const base = mdSection("blog-post", md);
  assert.equal(base.heading, "Blog post");
  assert.equal(base.theme, undefined);
  assert.equal(base.flow, undefined);
  assert.equal(
    base.content,
    "prose\n\n## hint: not a lesson — stays prose\nprose too",
  );
  assert.ok(!JSON.stringify(base).includes('"kind"'));
});

test("lessonBlocks ignores depth-1 headings below the wrapper's own", () => {
  // depth ≤ parentDepth headings belong to the caller: nothing hangs
  assert.deepEqual(lessonBlocks(["# top"], 1), ["# top"]);
});
