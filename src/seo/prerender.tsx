/**
 * Build-time content assembly for the SEO snapshots.
 *
 * Loaded ONLY through Vite's ssrLoadModule (from build/prerender.ts and
 * test/seo-snapshot.test.js): the imports below (src/content, the bespoke
 * page builders) resolve virtual: modules that only exist inside Vite,
 * and the functions here must never be imported by the client bundle.
 *
 * Content mapping walks the SAME trees the interactive pages render:
 * the pure page builders are imported straight from src/pages (they are
 * module-level pure functions — no hooks/store access at build), so the
 * snapshot and the app cannot drift structurally.
 */
import {
  addons,
  blogDirListing,
  configs,
  contacts,
  blog,
  projectPath,
  projects,
  routes,
  sections,
  type Route,
  type Section,
} from "@/content";
import { buildMusic } from "@/pages/MusicPage";
import { buildProjects } from "@/pages/ProjectsPage";
import { SITEMAP } from "@/pages/SitemapPage";
import { wowContent } from "@/pages/WowPage";
import { renderSnapshotHtml } from "./snapshot";

export type SnapshotPage = {
  /** The canonical URL path the page serves at (root-relative). */
  path: string;
  title: string;
  description: string;
  /** The html fragment to inject inside <div id="root">. */
  html: string;
};

/** Bespoke /resume page: the snapshot carries the page's own affordances
 * (the exact links ResumePage renders) — no copy is invented, and the
 * live iframe preview degrades to its link (crawlable as /resume.html). */
const RESUME_SNAPSHOT: Section = {
  heading: "Resume",
  content: [
    "[Open in new tab (formal design)](/documents/formal/resume.pdf)",
    "[View as PDF](/documents/resume.pdf)",
    "[View as HTML](/resume.html)",
  ],
};

/** Bespoke /404 page: mirrors NotFoundPage's window. */
const NOT_FOUND_SNAPSHOT: Section = {
  heading: "Not Found",
  content: ["That page does not exist.", "[Go home](/)"],
};

/** Route → the Section tree its page renders. Alias routes (route.alias)
 * answer null: the interactive page is a redirect there (App returns
 * Navigate before any content), so a full snapshot would be cloaking.
 * Exported for the test's drift guard. */
export function routeContent(
  route: Route,
): Section | Section[] | null | undefined {
  if (route.alias) return null;
  switch (route.page) {
    case "HomePage":
      return sections;
    case "ContactPage":
      return contacts;
    case "AddonsPage":
      return addons;
    case "ConfigsPage":
      return configs;
    case "BlogPage":
      return blog;
    case "SitemapPage":
      return SITEMAP;
    case "ProjectsPage":
      return buildProjects();
    case "MusicPage":
      return buildMusic();
    case "WowPage":
      // The "Full UI pack*" sections stay form-gated: they render only
      // after the download form verifies, so they must NOT appear in the
      // snapshot either (no cloaking).
      return wowContent;
    case "ProjectPage":
      return projects.find((p) => projectPath(p) === route.path)?.content;
    case "ResumePage":
      return RESUME_SNAPSHOT;
    case "NotFoundPage":
      return NOT_FOUND_SNAPSHOT;
    default:
      return null;
  }
}

/** One snapshot page per (non-alias) route, in route order. */
export function routeSnapshotPages(): SnapshotPage[] {
  const pages: SnapshotPage[] = [];
  for (const route of routes) {
    const content = routeContent(route);
    if (!content) continue;
    pages.push({
      path: route.path,
      title: route.title,
      description: route.description,
      html: renderSnapshotHtml(content),
    });
  }
  return pages;
}

/* ---------------------------------------------------------------- blog
 * /blog/** pages are indexable like every route (user decision): every
 * post file and every listed directory gets a real emitted html page.
 * The build (build/prerender.ts) walks public/blog/ and passes the raw
 * file contents in — src/seo never touches fs.
 */

export type BlogDirEntry = {
  path: string;
  files: string[];
  dirs: string[];
};

/** A raw blog file: the PUBLIC path ("/blog/x.md") plus its text. */
export type BlogSource = { publicPath: string; text: string };

/** An include target from build/includesPlugin's walk (same shape). */
export type IncludeEntry = { kind: "json" | "md"; content: string };

export type BlogEnv = {
  dirs: BlogDirEntry[];
  sources: BlogSource[];
  includes: Record<string, IncludeEntry>;
};

/* Mirrors src/content/index.ts's include expansion (mdSection +
 * expandContent/expandSection) — src/content/** cannot be edited, so the
 * logic is restated here; the route snapshot text test (which renders
 * include-carrying routes through BOTH loaders) doubles as the drift
 * guard. */

const stemOf = (publicPath: string): string =>
  publicPath
    .split("/")
    .pop()!
    .replace(/\.json$|\.md$/, "");

const humanize = (stem: string): string =>
  stem.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());

const mdSection = (stem: string, md: string): Section => {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  let heading: string | undefined;
  while (heading === undefined && lines.length > 0) {
    const line = lines[0] ?? "";
    if (line.trim() === "") lines.shift();
    else if (line.startsWith("# ")) {
      heading = line.slice(2).trim();
      lines.shift();
    } else break;
  }
  return {
    heading: heading ?? humanize(stem),
    anchor: stem,
    content: lines.join("\n"),
  };
};

function expandContent(
  content: NonNullable<Section["content"]>,
  ancestors: Set<string>,
  env: BlogEnv,
): NonNullable<Section["content"]> {
  if (typeof content === "string") return content;
  const items = Array.isArray(content) ? content : [content];
  return items.map((item) => {
    if (typeof item !== "object" || item === null) return item;
    if ("include" in item) {
      const name = item.include;
      if (typeof name !== "string") {
        throw new Error(`Unknown include directive: ${String(name)}`);
      }
      if (ancestors.has(name)) {
        throw new Error(`Circular include directive: ${name}`);
      }
      return targetSection(name, env, ancestors);
    }
    if ("banner" in item || "url" in item) return item;
    return expandSection(item as Section, ancestors, env);
  });
}

function expandSection(
  section: Section,
  ancestors: Set<string>,
  env: BlogEnv,
): Section {
  if (!section.content) return section;
  return {
    ...section,
    content: expandContent(section.content, ancestors, env),
  };
}

/** An include target resolved to its expanded Section — the same
 * resolution src/content/index.ts performs (drift-guarded by
 * test/seo-snapshot.test.js against the real loader's output). */
export function targetSection(
  name: string,
  env: BlogEnv,
  ancestors: Set<string>,
): Section {
  const target = env.includes[name];
  if (!target) {
    throw new Error(`Unknown include directive: ${name}`);
  }
  const chain = new Set(ancestors);
  chain.add(name);
  const section =
    target.kind === "json"
      ? (JSON.parse(target.content) as Section)
      : mdSection(stemOf(name), target.content);
  return expandSection(section, chain, env);
}

/** The post page's window tree for one blog file: .md files wrap as an
 * mdSection (the leading "# Heading" becomes the page's <h1>); .json
 * posts are their authored Section, includes expanded — the same shapes
 * BlogPostPage fetches and mounts (a .json post renders THAT file, a
 * .md post embeds <path>.md; see src/pages/BlogPostPage.tsx). */
function postSection(source: BlogSource, env: BlogEnv): Section | null {
  if (source.publicPath.endsWith(".json")) {
    const section = JSON.parse(source.text) as Section;
    return expandSection(section, new Set(), env);
  }
  if (!source.publicPath.endsWith(".md")) return null;
  return mdSection(stemOf(source.publicPath), source.text);
}

/** The post's URL path: the public path minus the .md/.json extension. */
const postPathOf = (source: BlogSource): string =>
  source.publicPath.replace(/\.md$|\.json$/i, "");

/** Whether the extension-less page address of a file is a POST page:
 * files the directory policy treats as posts (md/json — the same
 * extensions resolveRoute's blogDocumentRoute answers for). */
const isPostSource = (source: BlogSource): boolean =>
  /\.md$|\.json$/i.test(source.publicPath);

/** Meta conventions reused from the router (src/shell/resolveRoute.ts):
 * posts "«name» | blog of kine" / "«name» from the blog of kine.",
 * directory listings "«name» | blog of kine" / "«name» — the files in
 * this blog directory.". */
const blogTitle = (name: string) => `${name} | blog of kine`;
const postDescription = (name: string) => `${name} from the blog of kine.`;
const dirDescription = (name: string) =>
  `${name} — the files in this blog directory.`;

/** One snapshot page per blog post file (md/json, every directory — the
 * router addresses any extension-less /blog/** URL as a post page) and
 * per LISTED directory (the BlogDirPage listing; the /blog root is the
 * curated blog route, never a listing). */
export function blogSnapshotPages(env: BlogEnv): SnapshotPage[] {
  const pages: SnapshotPage[] = [];

  for (const source of env.sources) {
    if (!isPostSource(source)) continue;
    const section = postSection(source, env);
    if (!section) continue;
    const path = postPathOf(source);
    const name = path.split("/").filter(Boolean).pop() ?? path;
    pages.push({
      path,
      title: blogTitle(name),
      description: postDescription(name),
      html: renderSnapshotHtml(section),
    });
  }

  for (const dir of env.dirs) {
    if (dir.path === "/blog") continue; // the curated blog route's page
    const listing = blogDirListing(dir.path);
    if (!listing) continue; // opted-out directory: no listing page
    const name = dir.path.split("/").filter(Boolean).pop() ?? dir.path;
    pages.push({
      path: dir.path,
      title: blogTitle(name),
      description: dirDescription(name),
      html: renderSnapshotHtml(listing),
    });
  }

  return pages;
}
