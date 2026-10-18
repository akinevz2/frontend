#!/usr/bin/env node
// Ensures the xp.css submodule checkout exists and its dist is built.
// The fork ships dist/ as a generated artifact (gitignored upstream), so any
// bare `npm ci && npm run build` flow — Render's dashboard build command,
// CI, or a fresh local clone — must build it before vite can resolve
// `xp.css/dist/98.css`. Runs as a root postinstall hook, idempotent.
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const XP_DIR = path.resolve(process.cwd(), "xp.css");
const XP_BUNDLE = path.join(XP_DIR, "dist", "98.css");

if (process.env.WEBSITE_SKIP_XPCSS_ENSURE === "1") process.exit(0);

if (!existsSync(XP_BUNDLE)) {
    if (!existsSync(path.join(XP_DIR, "package.json"))) {
        console.log("[ensure-xpcss] submodule checkout missing — initializing");
        execSync("git submodule update --init --recursive", { stdio: "inherit" });
    }
    console.log("[ensure-xpcss] building xp.css dist");
    if (!existsSync(path.join(XP_DIR, "node_modules"))) {
        execSync("npm install --no-audit --no-fund", { stdio: "inherit", cwd: XP_DIR });
    }
    execSync("npm run build", { stdio: "inherit", cwd: XP_DIR });
}
