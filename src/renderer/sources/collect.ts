/** Node-only fs walks for the served content trees (blog today, learning
 * in Phase 2) and the disk `read` backend of include discovery. Imported
 * through `src/renderer/node.ts` only — never by the app bundle. */

import fs from "node:fs";
import path from "node:path";
import { discoverTargets, type IncludeEntry } from "../includes/resolve";

export type BlogDirEntry = {
  path: string;
  files: string[];
  /** Child directories, as their served paths (e.g. /blog/archive/tech). */
  dirs: string[];
};

/** Walks publicDir/<tree>/ into [{ path, files, dirs }] — depth-first,
 * names sorted case-insensitively for a stable module identity. The
 * tree ROOT's entry powers post-address resolution (/blog/<file>), but
 * the root itself never lists (the curated page lives there). Dotfiles
 * are skipped. */
export function listTreeDirs(
  publicDir: string,
  tree: string,
  dir: string = path.join(publicDir, tree),
  rel = "",
): BlogDirEntry[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    // No such tree at all: nothing lists.
    return [];
  }
  const files: string[] = [];
  const childDirs: string[] = [];
  const subdirs: BlogDirEntry[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    if (entry.isDirectory()) {
      childDirs.push(`/${tree}${rel}/${entry.name}`);
      subdirs.push(
        ...listTreeDirs(
          publicDir,
          tree,
          path.join(dir, entry.name),
          `${rel}/${entry.name}`,
        ),
      );
    } else {
      files.push(entry.name);
    }
  }
  const mine: BlogDirEntry[] = [
    {
      path: `/${tree}${rel}`,
      files: files.sort((a, b) =>
        a.toLowerCase().localeCompare(b.toLowerCase()),
      ),
      dirs: childDirs.sort((a, b) =>
        a.toLowerCase().localeCompare(b.toLowerCase()),
      ),
    },
    ...subdirs,
  ];
  return mine;
}

/** The blog tree's directory listing (the virtual:blog-dirs shape). */
export function listBlogDirs(publicDir: string): BlogDirEntry[] {
  return listTreeDirs(publicDir, "blog");
}

export type BlogSourceFile = { publicPath: string; text: string };

/** The .md/.json files of one served tree, recursively (the POST sources
 * the prerender renders). Plain fs reads; no network, no installs. */
export function collectTreeSources(
  publicDir: string,
  tree: string,
  dir: string = path.join(publicDir, tree),
  rel = "",
): BlogSourceFile[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    // No such tree at all: no sources.
    return [];
  }
  const sources: BlogSourceFile[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    if (entry.isDirectory()) {
      sources.push(
        ...collectTreeSources(
          publicDir,
          tree,
          path.join(dir, entry.name),
          `${rel}/${entry.name}`,
        ),
      );
      continue;
    }
    if (!/\.(md|json)$/i.test(entry.name)) continue;
    try {
      sources.push({
        publicPath: `/${tree}${rel}/${entry.name}`,
        text: fs.readFileSync(path.join(dir, entry.name), "utf8"),
      });
    } catch {
      // The file vanished mid-walk: leave it out.
    }
  }
  return sources;
}

export function collectBlogSources(publicDir: string): BlogSourceFile[] {
  return collectTreeSources(publicDir, "blog");
}

/** The sources of every served tree, flattened. */
export function collectSources(
  publicDir: string,
  trees: string[],
): BlogSourceFile[] {
  return trees.flatMap((tree) => collectTreeSources(publicDir, tree));
}

/** The disk `read` backend of include discovery: reads the public file at
 * a validated include path (paths.ts owns the shape rules; this backend
 * adds the disk-side guarantees — the path must resolve inside the real
 * public root, no symlink escape). */
export function makeFsReader(publicDir: string): (p: string) => IncludeEntry {
  const publicRoot = fs.realpathSync(publicDir);
  return (p) => {
    const file = path.join(publicDir, p);
    const real = fs.realpathSync(file);
    if (!(real === publicRoot || real.startsWith(publicRoot + path.sep))) {
      throw new Error(`include target escapes public/: ${p}`);
    }
    const kind: IncludeEntry["kind"] = p.endsWith(".json") ? "json" : "md";
    return { kind, content: fs.readFileSync(file, "utf8") };
  };
}

/** The env the prerender needs for one set of served trees: the listed
 * directories, the raw sources, and the include targets DISCOVERED FROM
 * THE DIRECTIVES THEMSELVES (reference-driven — no directory list, no
 * scan registry; docs/LEARNING_PLAN.md §4). */
export function collectTreeEnv(publicDir: string, trees: string[]) {
  const sources = collectSources(publicDir, trees);
  const roots = sources
    .filter((source) => source.publicPath.endsWith(".json"))
    .map((source) => ({ path: source.publicPath, text: source.text }));
  return {
    dirs: trees.flatMap((tree) => listTreeDirs(publicDir, tree)),
    sources,
    includes: discoverTargets(makeFsReader(publicDir), roots),
  };
}

export function collectBlogEnv(publicDir: string) {
  return collectTreeEnv(publicDir, ["blog"]);
}

/** The content date for a blog page's sitemap <lastmod>: the source
 * file's mtime (posts: <path>.md or <path>.json; listings: the
 * directory itself), as an ISO date. Undefined when nothing stats. */
export function blogPathDate(
  publicDir: string,
  publicPath: string,
): string | undefined {
  const base = path.join(publicDir, publicPath.replace(/^\/+/, ""));
  for (const candidate of [`${base}.md`, `${base}.json`, base]) {
    try {
      return fs.statSync(candidate).mtime.toISOString().slice(0, 10);
    } catch {
      /* try the next form */
    }
  }
  return undefined;
}
