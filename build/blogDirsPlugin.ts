import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";
import { PUBLIC } from "./env.ts";

/**
 * The blog directory listing, read straight from the filesystem.
 *
 * Serves the virtual module `virtual:blog-dirs`: public/blog/ and every
 * SUBdirectory below it, with the files and child directories each
 * holds, as the app's blog directory system consumes it
 * (src/content/blogDirs.ts). There is NO snapshot file to author, commit
 * or refresh — the walk runs when the module is first loaded (dev server
 * start, production build) and the dev watcher recomputes it whenever
 * public/blog/ changes, so the served listing is always exactly the
 * filesystem. The blog ROOT's entry powers post-address resolution
 * (/blog/<file>), but the root itself never lists (the curated blog.json
 * page lives there). Dotfiles are skipped.
 */

export type BlogDirEntry = {
  path: string;
  files: string[];
  /** Child directories, as their served paths (e.g. /blog/archive/tech). */
  dirs: string[];
};

const BLOG_ROOT = path.join(PUBLIC, "blog");

/** Walks public/blog/ into [{ path, files, dirs }] — depth-first, names
 * sorted case-insensitively for a stable module identity. Exported pure
 * so tests can assert the shape without touching fs. */
export function listBlogDirs(
  dir: string = BLOG_ROOT,
  rel = "",
): BlogDirEntry[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    // No public/blog at all: no directories list.
    return [];
  }
  const files: string[] = [];
  const childDirs: string[] = [];
  const subdirs: BlogDirEntry[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    if (entry.isDirectory()) {
      childDirs.push(`/blog${rel}/${entry.name}`);
      subdirs.push(
        ...listBlogDirs(path.join(dir, entry.name), `${rel}/${entry.name}`),
      );
    } else {
      files.push(entry.name);
    }
  }
  const mine: BlogDirEntry[] = [
    {
      path: `/blog${rel}`,
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

export function blogDirsPlugin(): Plugin {
  const moduleFor = () =>
    `export default ${JSON.stringify({ directories: listBlogDirs() })};`;
  return {
    name: "blog-dirs-virtual",
    resolveId(id) {
      if (id === "virtual:blog-dirs") return "\0virtual:blog-dirs";
      return null;
    },
    load(id) {
      if (id === "\0virtual:blog-dirs") return moduleFor();
      return null;
    },
    configureServer(server) {
      // Recompute and reload when the blog tree changes: new files list
      // themselves, removed ones vanish, no manual refresh step.
      server.watcher.add(BLOG_ROOT);
      const changed = (file: string) => {
        if (!file.startsWith(BLOG_ROOT)) return;
        const mod = server.moduleGraph.getModuleById("\0virtual:blog-dirs");
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: "full-reload" });
      };
      for (const event of ["add", "unlink", "addDir", "unlinkDir"] as const)
        server.watcher.on(event, changed);
    },
  };
}
