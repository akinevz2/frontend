import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

/**
 * The content-file include targets, read straight from the filesystem.
 *
 * Serves the virtual module `virtual:content-includes`: a map from
 * PUBLIC path ("/blog/releases/get-traversal.md") to the file's raw
 * text. Include directives in content JSON (src/content/index.ts)
 * reference these public paths, so a target doubles as a standalone
 * page served from the same address.
 *
 * There is NO snapshot to author, commit or refresh — the walk runs when
 * the module is first loaded (dev server start, production build) and
 * the dev watcher recomputes it whenever a scanned directory changes.
 *
 * The scanned directories ARE the registration: the public root
 * (.json Sections) and public/blog/releases/ (.md). Deliberately NOT
 * all of public/ — every scanned file is inlined into the JS bundle,
 * and public/ also holds every blog post, which is served statically.
 */

const VIRTUAL_ID = "virtual:content-includes";
const RESOLVED_ID = "\0" + VIRTUAL_ID;

/** Scanned directories, relative to public/ ("" = the public root). */
const INCLUDE_DIRS = ["", "blog/releases"];

export type IncludeEntry = { kind: "json" | "md"; content: string };

export function listIncludes(publicDir: string): Record<string, IncludeEntry> {
  const includes: Record<string, IncludeEntry> = {};
  for (const dir of INCLUDE_DIRS) {
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(path.join(publicDir, dir), {
        withFileTypes: true,
      });
    } catch {
      // No such directory at all: nothing to include from it.
      continue;
    }
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const ext = entry.name.endsWith(".json")
        ? "json"
        : entry.name.endsWith(".md")
          ? "md"
          : undefined;
      if (!ext) continue;
      const publicPath = path.posix.join("/", dir, entry.name);
      try {
        includes[publicPath] = {
          kind: ext,
          content: fs.readFileSync(
            path.join(publicDir, dir, entry.name),
            "utf8",
          ),
        };
      } catch {
        // The file vanished mid-walk: leave it out.
      }
    }
  }
  return includes;
}

export function contentIncludesPlugin(publicDir: string): Plugin {
  return {
    name: "content-includes",
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
      return undefined;
    },
    load(id) {
      if (id !== RESOLVED_ID) return undefined;
      const includes = listIncludes(publicDir);
      // dev watcher: watch each scanned file (file paths only — a
      // directory addWatchFile would be resolved as an import and fail)
      for (const publicPath of Object.keys(includes)) {
        this.addWatchFile(path.join(publicDir, publicPath));
      }
      return `export default ${JSON.stringify(includes)};`;
    },
    handleHotUpdate({ file, server }) {
      const watched = INCLUDE_DIRS.some((dir) =>
        file.startsWith(path.join(publicDir, dir, path.sep)),
      );
      if (!watched) return;
      const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
      if (mod) server.reloadModule(mod);
    },
  };
}
