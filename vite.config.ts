import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";

const pagesJsonPath = new URL("./src/pages.json", import.meta.url);
const pages = JSON.parse(fs.readFileSync(pagesJsonPath, "utf-8")) as Array<{ path: string }>;

function routeSkeletonPlugin() {
  return {
    name: "vite-plugin-route-skeletons",
    apply: "build",
    closeBundle() {
      const outDir = path.resolve(process.cwd(), "dist");
      const indexPath = path.join(outDir, "index.html");
      if (!fs.existsSync(indexPath)) {
        return;
      }

      const indexHtml = fs.readFileSync(indexPath, "utf-8");

      for (const page of pages) {
        const routePath = page.path || "/";
        if (routePath === "/") {
          continue;
        }

        const normalizedRoute = routePath.replace(/^\/+|\/+$/g, "");
        if (!normalizedRoute) {
          continue;
        }

        const routeDir = path.join(outDir, normalizedRoute);
        fs.mkdirSync(routeDir, { recursive: true });
        fs.writeFileSync(path.join(routeDir, "index.html"), indexHtml, "utf-8");
        fs.writeFileSync(path.join(outDir, `${normalizedRoute}.html`), indexHtml, "utf-8");
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), routeSkeletonPlugin()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return;
          }

          if (id.includes("react-markdown") || id.includes("rehype-raw")) {
            return "markdown";
          }

          if (id.includes("react-toastify")) {
            return "toastify";
          }

          if (id.includes("xp.css")) {
            return "xpcss";
          }

          return "vendor";
        },
      },
    },
  },
  server: {
    host: true,
    port: 8086,
    watch: {
      usePolling: true,
    },
  },
});