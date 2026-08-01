import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The admin frontend is served by the .NET backend at root (/)
// so asset paths use the default base of "./"
export default defineConfig({
    plugins: [react()],
    base: "./",
    build: {
        outDir: "../wwwroot",
        emptyOutDir: true,
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