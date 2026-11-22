import path from "node:path";
import type { Plugin } from "vite";
import { PUBLIC } from "./env.ts";
import { listBlogDirs, listTreeDirs } from "../src/renderer/node.ts";

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
const LEARNING_ROOT = path.join(PUBLIC, "learning");

export function blogDirsPlugin(): Plugin {
  const moduleFor = () =>
    `export default ${JSON.stringify({ directories: listBlogDirs(PUBLIC) })};`;
  const learningModuleFor = () =>
    `export default ${JSON.stringify({ directories: listTreeDirs(PUBLIC, "learning") })};`;
  return {
    name: "blog-dirs-virtual",
    resolveId(id) {
      if (id === "virtual:blog-dirs") return "\0virtual:blog-dirs";
      if (id === "virtual:learning-tree") return "\0virtual:learning-tree";
      return null;
    },
    load(id) {
      if (id === "\0virtual:blog-dirs") return moduleFor();
      if (id === "\0virtual:learning-tree") return learningModuleFor();
      return null;
    },
    configureServer(server) {
      // Recompute and reload when either tree changes: new files list
      // themselves, removed ones vanish, no manual refresh step.
      server.watcher.add(BLOG_ROOT);
      server.watcher.add(LEARNING_ROOT);
      const changed = (root: string, id: string) => (file: string) => {
        if (!file.startsWith(root)) return;
        const mod = server.moduleGraph.getModuleById(id);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: "full-reload" });
      };
      const onBlogChange = changed(BLOG_ROOT, "\0virtual:blog-dirs");
      const onLearningChange = changed(
        LEARNING_ROOT,
        "\0virtual:learning-tree",
      );
      for (const event of ["add", "unlink", "addDir", "unlinkDir"] as const) {
        server.watcher.on(event, onBlogChange);
        server.watcher.on(event, onLearningChange);
      }
    },
  };
}
