import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";
import { discoverTargets } from "../src/renderer/index.ts";
import { makeFsReader } from "../src/renderer/node.ts";

/**
 * The include targets, DISCOVERED FROM THE DIRECTIVES THEMSELVES.
 *
 * Serves the virtual module `virtual:content-targets`: a map from PUBLIC
 * path ("/blog/releases/get-traversal.md") to the file's raw text,
 * holding exactly the targets the content's `{"include": "..."}` strings
 * name — the transitive closure over `.json` targets, which may carry
 * directives of their own. There is NO directory list, NO allowlist and
 * NO scan of public/: the roots are the content files themselves
 * (the .json files under src/content — the set the app bundles), so a directive
 * pointing at a brand-new file under public/ inlines it with no other
 * config edit, and a dangling path throws here and FAILS THE BUILD,
 * naming the including file and the path (see
 * src/renderer/includes/resolve.ts). Every scanned file is inlined into
 * the JS bundle — but only the referenced ones.
 */

const VIRTUAL_ID = "virtual:content-targets";
const RESOLVED_ID = "\0" + VIRTUAL_ID;

/** The content roots: every .json under src/content (page content and
 * project documents alike), as { path, text }. */
function readContentRoots(contentDir: string): Array<{
  path: string;
  text: string;
}> {
  const roots: Array<{ path: string; text: string }> = [];
  const walk = (dir: string, rel: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      if (entry.isDirectory()) {
        walk(path.join(dir, entry.name), `${rel}/${entry.name}`);
        continue;
      }
      if (!entry.name.endsWith(".json")) continue;
      roots.push({
        // Relative to contentDir — the same base every join below uses.
        path: `${rel}/${entry.name}`,
        text: fs.readFileSync(path.join(dir, entry.name), "utf8"),
      });
    }
  };
  walk(contentDir, "");
  return roots;
}

export function contentTargetsPlugin(
  publicDir: string,
  contentDir: string,
): Plugin {
  return {
    name: "content-targets",
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
      return undefined;
    },
    load(id) {
      if (id !== RESOLVED_ID) return undefined;
      const roots = readContentRoots(contentDir);
      const entries = discoverTargets(makeFsReader(publicDir), roots);
      // dev watcher: watch the content roots and each discovered target
      // (file paths only — a directory addWatchFile would be resolved as
      // an import and fail)
      for (const root of roots)
        this.addWatchFile(path.join(contentDir, root.path));
      for (const publicPath of Object.keys(entries)) {
        this.addWatchFile(path.join(publicDir, publicPath));
      }
      return `export default ${JSON.stringify(entries)};`;
    },
    handleHotUpdate({ file, server }) {
      // the content roots themselves, or any discovered target file
      const targets = discoverTargets(
        makeFsReader(publicDir),
        readContentRoots(contentDir),
      );
      const watched =
        file.startsWith(contentDir) ||
        Object.keys(targets).some((publicPath) =>
          file.startsWith(path.join(publicDir, publicPath)),
        );
      if (!watched) return;
      const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
      if (mod) server.reloadModule(mod);
    },
  };
}
