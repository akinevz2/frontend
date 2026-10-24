import assert from "node:assert/strict";
import { test } from "node:test";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { rehypeYoutubeEmbed } from "../src/lib/rehypeYoutubeEmbed.ts";

// Mirrors the rehype pipeline in src/lib/markdown.tsx, including the
// sanitize schema that whitelists iframe embeds.
const schema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), "iframe"],
  attributes: {
    ...defaultSchema.attributes,
    iframe: [
      "src",
      "width",
      "height",
      "title",
      "allow",
      "allowFullScreen",
      "loading",
      "style",
      "referrerPolicy",
    ],
  },
};

const processor = unified()
  .use(remarkParse)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeYoutubeEmbed)
  .use(rehypeSanitize, schema);

function process(md) {
  return processor.runSync(processor.parse(md));
}

function collect(node, tagName, acc = []) {
  if (!node || typeof node !== "object") return acc;
  if (node.tagName === tagName) acc.push(node);
  for (const child of node.children ?? []) collect(child, tagName, acc);
  return acc;
}

test("a bare youtu.be autolink becomes an iframe embed", () => {
  const tree = process("Here is my video:\n\n<https://youtu.be/n_L-E8K_gcg>\n");
  const iframes = collect(tree, "iframe");
  const links = collect(tree, "a");
  assert.equal(iframes.length, 1);
  assert.equal(links.length, 0);
  assert.equal(
    iframes[0].properties.src,
    "https://www.youtube-nocookie.com/embed/n_L-E8K_gcg",
  );
  assert.equal(iframes[0].properties.title, "YouTube video");
  assert.equal(iframes[0].properties.loading, "lazy");
  // Error 153 fix: the iframe must send a referrer despite the site's
  // no-referrer header, so the plugin sets its own policy.
  assert.equal(
    iframes[0].properties.referrerPolicy,
    "strict-origin-when-cross-origin",
  );
});

test("watch, embed, shorts and plain links all convert", () => {
  const cases = [
    ["https://www.youtube.com/watch?v=n_L-E8K_gcg", "n_L-E8K_gcg"],
    ["https://youtube.com/watch?v=n_L-E8K_gcg&t=30s", "n_L-E8K_gcg"],
    ["https://www.youtube.com/embed/n_L-E8K_gcg", "n_L-E8K_gcg"],
    ["https://www.youtube.com/shorts/n_L-E8K_gcg", "n_L-E8K_gcg"],
    ["https://youtu.be/Ab12Cd34_-x", "Ab12Cd34_-x"],
  ];
  for (const [url, id] of cases) {
    const tree = process(`See <${url}> for details.\n`);
    const iframes = collect(tree, "iframe");
    assert.equal(iframes.length, 1, url);
    assert.equal(
      iframes[0].properties.src,
      `https://www.youtube-nocookie.com/embed/${id}`,
      url,
    );
  }
});

test("markdown link syntax [text](url) converts too", () => {
  const tree = process("[my talk](https://youtu.be/n_L-E8K_gcg)\n");
  const iframes = collect(tree, "iframe");
  assert.equal(iframes.length, 1);
  assert.equal(
    iframes[0].properties.src,
    "https://www.youtube-nocookie.com/embed/n_L-E8K_gcg",
  );
});

test("bare URLs in plain text are not links and stay untouched", () => {
  // remark-parse without remark-gfm does not autolink bare URLs, so the
  // plugin has nothing to transform — the text passes through unchanged.
  const tree = process("Visit https://youtu.be/n_L-E8K_gcg some day.\n");
  assert.equal(collect(tree, "iframe").length, 0);
  assert.equal(collect(tree, "a").length, 0);
});

test("non-YouTube links are left as links", () => {
  const tree = process("Docs at <https://example.com/watch?v=x> live here.\n");
  const iframes = collect(tree, "iframe");
  const links = collect(tree, "a");
  assert.equal(iframes.length, 0);
  assert.equal(links.length, 1);
  assert.equal(links[0].properties.href, "https://example.com/watch?v=x");
});

test("youtube link used inline within a paragraph still converts", () => {
  const tree = process(
    "I recorded my herbstluftwm talk: <https://youtu.be/n_L-E8K_gcg> — enjoy.",
  );
  const iframes = collect(tree, "iframe");
  const links = collect(tree, "a");
  assert.equal(iframes.length, 1);
  assert.equal(links.length, 0);
});

test("embeds survive rehype-sanitize", () => {
  const tree = process("<https://youtu.be/n_L-E8K_gcg>\n");
  const iframes = collect(tree, "iframe");
  assert.equal(iframes.length, 1);
  assert.equal(
    iframes[0].properties.src,
    "https://www.youtube-nocookie.com/embed/n_L-E8K_gcg",
  );
});
