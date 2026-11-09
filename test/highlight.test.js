import assert from "node:assert/strict";
import { test } from "node:test";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import { rehypeHighlightSubset } from "../src/lib/rehypeHighlightSubset.ts";
import rehypeSanitize from "rehype-sanitize";
import { visit } from "unist-util-visit";
import { sanitizeSchema } from "../src/lib/sanitizeSchema.ts";

// The exact pipeline src/lib/markdown.tsx runs (minus the YouTube embed
// plugin, irrelevant here); returns every element with its classes.
const processor = unified()
  .use(remarkParse)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeHighlightSubset)
  .use(rehypeSanitize, sanitizeSchema);

const process = async (markdown) => {
  const tree = await processor.run(processor.parse(markdown));
  const elements = [];
  // Braces matter: visit() treats a numeric return (els.push()'s new length)
  // as a "continue traversal at index N" directive, silently skipping nodes.
  visit(tree, "element", (el) => {
    elements.push([el.tagName, el.properties?.className ?? []]);
  });
  return elements;
};

const classes = (elements, tag) =>
  elements.filter(([name]) => name === tag).flatMap(([, cn]) => cn);

test("fenced code gets highlight.js language classes", async () => {
  const elements = await process("```ts\nconst answer: number = 42;\n```");
  assert.ok(classes(elements, "code").includes("language-ts"));
});

test("hljs token spans survive rehype-sanitize", async () => {
  const elements = await process("```js\nconst answer = 42; // note\n```");
  const spanClasses = classes(elements, "span");
  assert.ok(spanClasses.includes("hljs-keyword"));
  assert.ok(spanClasses.includes("hljs-comment"));
});

test("unknown languages still get the language class and plain code", async () => {
  const elements = await process("```notalanguage\nhello\n```");
  assert.ok(classes(elements, "code").includes("language-notalanguage"));
  // The text node stays plain inside the code element.
  const code = elements.find(([, cn]) => cn.includes("language-notalanguage"));
  assert.ok(code);
});

test("```shell fences highlight as session transcripts", async () => {
  const elements = await process("```shell\n> get docs\n```");
  const spanClasses = classes(elements, "span");
  assert.ok(spanClasses.includes("hljs-meta"));
  assert.ok(spanClasses.includes("bash"));
});
