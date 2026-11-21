import { test } from "node:test";
import assert from "node:assert/strict";
import { createSeoServer } from "../build/prerenderServer.ts";
import { collectBlogEnv } from "../build/blogSources.ts";

/* The drift guard: for every route and every blog page, every text
 * string in the content tree must appear in the snapshot html.
 *
 * Strings are markdown SOURCE, so rendering legitimately consumes
 * markers (**bold**, [label](url)). Two checks per string:
 *  - strict: strings without markdown markers must appear escape-aware,
 *    verbatim;
 *  - word-level: every word (md markers stripped) must appear in the
 *    html's text (tags stripped) or attributes (entities decoded). */

const escapeHtml = (value) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");

const unescapeHtml = (value) =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ");

const hasMarkdownMarkers = (s) => /[*_`~#\[\]>]|!?\[[^\]]*\]\([^)]*\)/.test(s);

const stripMarkdown = (s) =>
  s
    .replace(/!\[([^\]]*)\]\(([^)]*)\)/g, "$1 $2")
    .replace(/\[([^\]]*)\]\(([^)]*)\)/g, "$1 $2")
    .replace(/[*_`~#>|]+/g, " ");

const words = (s) =>
  new Set(
    (s.toLowerCase().match(/[a-z0-9][a-z0-9'+./-]{2,}/g) ?? []).map((w) =>
      // sentence punctuation after a URL must not poison the token
      w.replace(/[.,;:!?)\]]+$/, ""),
    ),
  );

function corpus(html) {
  const raw = unescapeHtml(html);
  // highlighting spans split source tokens across text nodes: keep both
  // a space-joined and a concatenation view of the tag-stripped text
  const spaced = unescapeHtml(html.replace(/<[^>]+>/g, " "));
  const joined = unescapeHtml(html.replace(/<[^>]+>/g, ""));
  return `${raw}\n${spaced}\n${joined}`.toLowerCase();
}

/** The markdown pipeline rewrites YouTube links into youtube-nocookie
 * embeds (src/lib/rehypeYoutubeEmbed.ts) — the same rewrite the
 * interactive page performs. The snapshot degrades the embed to a link
 * whose href is the EMBED url, so the test mirrors the rewrite. */
const normalizeYoutube = (s) =>
  s
    .replace(
      /https?:\/\/youtu\.be\/([A-Za-z0-9_-]+)/g,
      "https://www.youtube-nocookie.com/embed/$1",
    )
    .replace(
      /https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([A-Za-z0-9_-]+)[^)\s]*/g,
      "https://www.youtube-nocookie.com/embed/$1",
    );

/** Every string in a Section tree: headings, status, text items,
 * embed titles, banner lines. */
function sectionStrings(section, acc = []) {
  if (!section) return acc;
  if (section.heading) acc.push(section.heading);
  if (section.status) acc.push(section.status);
  const content = section.content;
  if (typeof content === "string") {
    acc.push(content);
  } else if (Array.isArray(content)) {
    for (const item of content) {
      if (typeof item === "string") acc.push(item);
      else if (item && typeof item === "object") {
        if ("include" in item) continue; // expanded at load
        if ("url" in item) {
          acc.push(item.title);
        } else if ("banner" in item) {
          acc.push(...item.banner.lines);
        } else {
          sectionStrings(item, acc);
        }
      }
    }
  } else if (content && typeof content === "object") {
    if ("include" in content) {
      /* expanded */
    } else if ("url" in content) {
      acc.push(content.title);
    } else if ("banner" in content) {
      acc.push(...content.banner.lines);
    } else {
      sectionStrings(content, acc);
    }
  }
  return acc;
}

function assertStringInSnapshot(strings, html, label) {
  const hay = corpus(html);
  for (const raw of strings) {
    if (!raw) continue;
    if (!hasMarkdownMarkers(raw)) {
      assert.ok(
        html.includes(escapeHtml(raw)),
        `${label}: plain string missing verbatim: ${JSON.stringify(raw)}`,
      );
      continue;
    }
    for (const word of words(normalizeYoutube(stripMarkdown(raw)))) {
      assert.ok(
        hay.includes(word),
        `${label}: markdown word missing: "${word}" of ${JSON.stringify(raw)}`,
      );
    }
  }
}

function assertSnapshotShape(html, label) {
  assert.ok(html.includes("data-seo-snapshot"), `${label}: snapshot wrapper`);
  const h1 = html.match(/<h1[\s>]/g) ?? [];
  assert.equal(h1.length, 1, `${label}: exactly one <h1>`);
  assert.ok(!/<iframe[\s>]/i.test(html), `${label}: no <iframe>`);
}

test("every route renders a snapshot covering its content tree", async () => {
  const server = await createSeoServer();
  try {
    const prerender = await server.ssrLoadModule("/src/seo/prerender.tsx");
    const { routes } = await server.ssrLoadModule("/src/content/index.ts");
    const pages = prerender.routeSnapshotPages();
    const byPath = new Map(pages.map((p) => [p.path, p]));
    const aliased = routes.filter((r) => r.alias).map((r) => r.path);
    for (const route of routes) {
      const page = byPath.get(route.path);
      if (aliased.includes(route.path)) {
        assert.equal(page, undefined, `${route.path}: alias has no snapshot`);
        continue;
      }
      assert.ok(page, `${route.path}: snapshot page exists`);
      assert.equal(page.title, route.title);
      assert.equal(page.description, route.description);
      assertSnapshotShape(page.html, route.path);
      assertStringInSnapshot(
        sectionStrings(prerender.routeContent(route)),
        page.html,
        route.path,
      );
    }
    assert.equal(
      pages.length,
      routes.filter((r) => !r.alias).length,
      "one snapshot page per non-alias route",
    );
  } finally {
    await server.close();
  }
});

test("every blog post and listed directory renders a snapshot page", async () => {
  const server = await createSeoServer();
  try {
    const prerender = await server.ssrLoadModule("/src/seo/prerender.tsx");
    const blog = await server.ssrLoadModule("/src/content/blogDirs.ts");
    const env = collectBlogEnv();
    const pages = prerender.blogSnapshotPages(env);
    const byPath = new Map(pages.map((p) => [p.path, p]));

    // one page per post source (.md/.json anywhere under /blog/),
    // addressed extension-less
    const postPaths = new Set(
      env.sources
        .filter((s) => /\.(md|json)$/i.test(s.publicPath))
        .map((s) => s.publicPath.replace(/\.md$|\.json$/i, "")),
    );
    for (const path of postPaths) {
      assert.ok(byPath.get(path), `blog post page: ${path}`);
    }
    // one page per listed directory (the /blog root is the curated route)
    for (const dir of env.dirs) {
      if (dir.path === "/blog") continue;
      if (!blog.blogDirListed(dir.path)) continue;
      assert.ok(byPath.get(dir.path), `blog dir page: ${dir.path}`);
    }
    assert.equal(
      new Set(pages.map((p) => p.path)).size,
      pages.length,
      "blog page paths are unique",
    );
    for (const page of pages) {
      assertSnapshotShape(page.html, page.path);
    }
  } finally {
    await server.close();
  }
});

test("blog post snapshots carry their own file's text", async () => {
  const server = await createSeoServer();
  try {
    const prerender = await server.ssrLoadModule("/src/seo/prerender.tsx");
    const env = collectBlogEnv();
    const pages = prerender.blogSnapshotPages(env);
    for (const source of env.sources) {
      if (!/\.(md|json)$/i.test(source.publicPath)) continue;
      const path = source.publicPath.replace(/\.md$|\.json$/i, "");
      const page = pages.find((p) => p.path === path);
      assert.ok(page, `${path}: page exists`);
      // the .md source text verbatim-ish (words), or the .json post's
      // authored section (JSON keys like "heading" are not content)
      if (/\.json$/i.test(source.publicPath)) {
        assertStringInSnapshot(
          sectionStrings(JSON.parse(source.text)),
          page.html,
          path,
        );
      } else {
        assertStringInSnapshot([source.text], page.html, path);
      }
    }
  } finally {
    await server.close();
  }
});

test("include expansion mirrors the content loader (drift guard)", async () => {
  const server = await createSeoServer();
  try {
    const prerender = await server.ssrLoadModule("/src/seo/prerender.tsx");
    const content = await server.ssrLoadModule("/src/content/index.ts");
    // got-source.json embeds {"include": "/blog/releases/get-traversal.md"};
    // the real loader expanded it inside its project tree — the mirror
    // must expand the SAME target to the SAME section.
    const project = content.projects.find((p) => p.slug === "got-source");
    assert.ok(project, "got-source project");
    const real = findSectionByHeading(project.content, "get Usage");
    assert.ok(real, "loader-expanded get-traversal section");
    const env = collectBlogEnv();
    const mine = prerender.targetSection(
      "/blog/releases/get-traversal.md",
      env,
      new Set(),
    );
    assert.deepEqual(mine, real);
    // and the characters.json include target parses to the same Section
    const characters = prerender.targetSection(
      "/characters.json",
      env,
      new Set(),
    );
    assert.equal(characters.heading, "Gallery");
  } finally {
    await server.close();
  }
});

function findSectionByHeading(section, heading) {
  if (!section || typeof section !== "object") return null;
  if (section.heading === heading) return section;
  const items = Array.isArray(section.content)
    ? section.content
    : section.content &&
        typeof section.content === "object" &&
        !("include" in section.content) &&
        !("url" in section.content) &&
        !("banner" in section.content)
      ? [section.content]
      : [];
  for (const item of items) {
    if (typeof item !== "object" || item === null) continue;
    const found = findSectionByHeading(item, heading);
    if (found) return found;
  }
  return null;
}
