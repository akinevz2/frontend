import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { manualChunks } from "./build/chunks.ts";
import { DEV_HOST, DEV_PORT, ROOT, SECURITY_HEADERS } from "./build/env.ts";
import { blogDocumentsPlugin } from "./build/blogDocumentsPlugin.ts";
import { routeSkeletonsPlugin } from "./build/routeSkeletonsPlugin.ts";

const fromRoot = (p: string) => path.resolve(ROOT, p);

export default defineConfig({
  publicDir: "public",
  resolve: {
    alias: {
      "@": fromRoot("src"),
      "@page-slide": fromRoot("packages/page-slide/src"),
      "@public": fromRoot("public"),
      "@content": fromRoot("src/content"),
    },
  },
  plugins: [react(), blogDocumentsPlugin(), routeSkeletonsPlugin()],
  build: {
    cssMinify: false,
    rollupOptions: { output: { manualChunks } },
  },
  server: {
    host: DEV_HOST,
    port: DEV_PORT,
    strictPort: true,
    cors: false,
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
