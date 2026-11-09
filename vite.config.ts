import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { manualChunks } from "./build/chunks.ts";
import { DEV_HOST, DEV_PORT, ROOT, SECURITY_HEADERS } from "./build/env.ts";
import { blogDocumentsPlugin } from "./build/blogDocumentsPlugin.ts";
import { blogDirsPlugin } from "./build/blogDirsPlugin.ts";
import { cssSourceMapCommentPlugin } from "./build/cssSourceMapCommentPlugin.ts";
import { routeSkeletonsPlugin } from "./build/routeSkeletonsPlugin.ts";
import { projectMtimesPlugin } from "./build/projectMtimesPlugin.ts";
import { contentIncludesPlugin } from "./build/includesPlugin.ts";

const fromRoot = (p: string) => path.resolve(ROOT, p);

export default defineConfig({
  publicDir: "public",
  resolve: {
    alias: {
      "@": fromRoot("src"),
      "@public": fromRoot("public"),
      "@content": fromRoot("src/content"),
      // xp.css is the git submodule (akinevz2/XP.css fork, branch
      // build-system-modernization); its dist/ is built by node build.js,
      // not shipped, so resolve the bare "xp.css/..." specifiers there.
      "xp.css": fromRoot("xp.css"),
    },
  },
  plugins: [
    react(),
    blogDocumentsPlugin(),
    blogDirsPlugin(),
    routeSkeletonsPlugin(),
    projectMtimesPlugin(path.resolve(ROOT, "src/content/projects")),
    contentIncludesPlugin(path.resolve(ROOT, "public")),
    // The 98.css dist ships sourceMappingURL comments into the bundle; the
    // maps are not deployed, so Firefox logs a 404 for each. Strip them.
    cssSourceMapCommentPlugin(),
  ],
  build: {
    cssMinify: false,
    rollupOptions: { output: { manualChunks } },
  },
  server: {
    host: DEV_HOST,
    port: DEV_PORT,
    strictPort: true,
    cors: false,
    allowedHosts: ["ws-vision", ".ws-vision"], // remote dev machine hostname
    headers: SECURITY_HEADERS,
    watch: { usePolling: true },
  },
  preview: {
    host: DEV_HOST,
    port: DEV_PORT,
    strictPort: true,
    headers: SECURITY_HEADERS,
  },
});
