import { createServer, type ViteDevServer } from "vite";
import path from "node:path";
import { PUBLIC, ROOT } from "./env.ts";
import { blogDirsPlugin } from "./blogDirsPlugin.ts";
import { contentTargetsPlugin } from "./contentTargetsPlugin.ts";
import { projectMtimesPlugin } from "./projectMtimesPlugin.ts";

const fromRoot = (p: string) => path.resolve(ROOT, p);

/**
 * A temporary, in-memory Vite server used ONLY to load the content
 * loader (src/content) and the snapshot modules (src/renderer/snapshot)
 * outside the browser build: the virtual modules those import
 * (virtual:blog-dirs, virtual:content-targets, virtual:project-mtimes)
 * resolve through the same plugins vite.config.ts wires for the real
 * build, and the alias map is reused verbatim. Middleware mode with no
 * HMR, no optimizer discovery, no network: this is a module-loading
 * harness, closed as soon as the snapshots are rendered (constraint:
 * the deploy build stays cheap and side-effect-free).
 */
export async function createSeoServer(): Promise<ViteDevServer> {
  return createServer({
    configFile: false,
    root: ROOT,
    appType: "custom",
    optimizeDeps: { noDiscovery: true },
    logLevel: "error",
    resolve: {
      alias: {
        "@": fromRoot("src"),
        "@public": fromRoot("public"),
        "@content": fromRoot("src/content"),
        "xp.css": fromRoot("xp.css"),
      },
    },
    plugins: [
      blogDirsPlugin(),
      contentTargetsPlugin(PUBLIC, path.resolve(ROOT, "src/content")),
      projectMtimesPlugin(path.resolve(ROOT, "src/content/projects")),
    ],
    server: { middlewareMode: true, hmr: false },
  });
}
