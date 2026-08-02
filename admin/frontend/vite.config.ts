import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    base: "./",
    build: {
        outDir: "../wwwroot",
        emptyOutDir: true,
        cssMinify: false,
    },
    server: {
        port: 8087,
        proxy: {
           "/auth": "http://localhost:8080",
           "/api": "http://localhost:8080",
           "/status": "http://localhost:8080",
        },
    },
});
