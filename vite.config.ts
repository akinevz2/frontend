import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
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