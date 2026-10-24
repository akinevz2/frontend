import assert from "node:assert/strict";
import { test } from "node:test";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import { rehypeYoutubeEmbed } from "../src/lib/rehypeYoutubeEmbed.ts";
// The exact schema the real pipeline uses (src/lib/markdown.tsx) — no
// local mirror that could drift from it.
import { sanitizeSchema } from "../src/lib/sanitizeSchema.ts";

const processor = unified()
  .use(remarkParse)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeYoutubeEmbed)
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
    ["https://m.youtube.com/watch?v=n_L-E8K_gcg", "n_L-E8K_gcg"],
    ["https://music.youtube.com/watch?v=n_L-E8K_gcg", "n_L-E8K_gcg"],
    ["https://www.youtube-nocookie.com/embed/n_L-E8K_gcg", "n_L-E8K_gcg"],
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

test("the embed stays inside its container and keeps its 16:9 shape", () => {
  const tree = process("<https://youtu.be/n_L-E8K_gcg>\n");
  const style = String(collect(tree, "iframe")[0].properties.style);
  assert.match(style, /width:\s*100%/);
  // A 560px-wide embed overflowed narrow (mobile) window bodies.
  assert.match(style, /max-width:\s*560px/);
  assert.match(style, /aspect-ratio:\s*16\s*\/\s*9/);
  // `height: auto` lets the ratio win over the height attribute.
  assert.match(style, /height:\s*auto/);
});

test("markdown link text becomes the accessible player title", () => {
  const tree = process("[my talk](https://youtu.be/n_L-E8K_gcg)\n");
  const iframes = collect(tree, "iframe");
  assert.equal(iframes.length, 1);
  assert.equal(iframes[0].properties.title, "my talk");
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

test("playlist links stay links instead of dropping the playlist", () => {
  const cases = [
    "https://www.youtube.com/watch?v=n_L-E8K_gcg&list=PLAOwLA0fz3HQCtJ5",
    "https://youtu.be/n_L-E8K_gcg?list=PLAOwLA0fz3HQCtJ5",
    "https://www.youtube.com/playlist?list=PLAOwLA0fz3HQCtJ5",
  ];
  for (const url of cases) {
    const tree = process(`Playlist: <${url}>\n`);
    assert.equal(collect(tree, "iframe").length, 0, url);
    const links = collect(tree, "a");
    assert.equal(links.length, 1, url);
    assert.equal(links[0].properties.href, url);
  }
});

test("in-page anchor links (e.g. the clippy trigger) stay links", () => {
  const tree = process("[talk to me](#clippy)\n");
  const iframes = collect(tree, "iframe");
  const links = collect(tree, "a");
  assert.equal(iframes.length, 0);
  assert.equal(links.length, 1);
  assert.equal(links[0].properties.href, "#clippy");
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
  // The responsive style must survive sanitization too.
  assert.ok(String(iframes[0].properties.style).includes("aspect-ratio"));
});
