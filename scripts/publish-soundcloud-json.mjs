#!/usr/bin/env node
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { copyFileSync, existsSync } from "node:fs";
import { withGitWorktree } from "./git-worktree-helper.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths
const BLOG_DIRSTRING = "blog";
const WEBSITE_DIR = resolve(__dirname, "..");
const BLOG_DIR = resolve(WEBSITE_DIR, BLOG_DIRSTRING);
const SOUNDCloudJSON_PATH = resolve(WEBSITE_DIR, "public", "soundcloud.json");
const BLOG_SOUNDCloudJSON_PATH = resolve(BLOG_DIR, "soundcloud.json");

console.log("🚀 Publishing soundcloud.json to GitHub...");

// Step 1: Ensure soundcloud.json exists
if (!existsSync(SOUNDCloudJSON_PATH)) {
    console.error("❌ soundcloud.json not found. Run 'npm run generate:music' first.");
    process.exit(1);
}

// Step 2: Copy to blog directory
withGitWorktree(BLOG_DIRSTRING, "blog-posts", async (worktreeDir) => {
    console.log("📋 Copying soundcloud.json to blog worktree...");
    copyFileSync(SOUNDCloudJSON_PATH, BLOG_SOUNDCloudJSON_PATH);
});

console.log("✅ Successfully published soundcloud.json to GitHub!");