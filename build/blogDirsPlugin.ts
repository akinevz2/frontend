import path from "node:path";
import type { Plugin } from "vite";
import { PUBLIC } from "./env.ts";
import { listBlogDirs } from "../src/renderer/node.ts";

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
 * page lives there). Dotfiles are skipped. The walk itself lives in
 * src/renderer/sources/collect.ts (exported through the node
 * entrypoint).
 */

const BLOG_ROOT = path.join(PUBLIC, "blog");

export function blogDirsPlugin(): Plugin {
  const moduleFor = () =>
    `export default ${JSON.stringify({ directories: listBlogDirs(PUBLIC) })};`;
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
