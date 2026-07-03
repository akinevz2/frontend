import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

const workspaceRoot = process.cwd();
const blogDir = path.resolve(workspaceRoot, "blog");
const publicBlogLink = path.resolve(workspaceRoot, "public/blog-assets");

function isSameTargetSymlink(linkPath, expectedTargetPath) {
  if (!fs.existsSync(linkPath)) {
    return false;
  }

  const stats = fs.lstatSync(linkPath);
  if (!stats.isSymbolicLink()) {
    return false;
  }

  return fs.realpathSync(linkPath) === fs.realpathSync(expectedTargetPath);
}

function ensureBlogSymlink() {
  if (!fs.existsSync(blogDir)) {
    console.warn("[dev] blog directory is missing; local blog assets symlink was not created.");
    return;
  }

  if (fs.existsSync(publicBlogLink)) {
    const stats = fs.lstatSync(publicBlogLink);
    if (stats.isSymbolicLink()) {
      if (isSameTargetSymlink(publicBlogLink, blogDir)) {
        return;
      }
      fs.unlinkSync(publicBlogLink);
    } else {
      console.warn("[dev] public/blog-assets exists and is not a symlink; leaving it unchanged.");
      return;
    }
  }

  const relativeTarget = path.relative(path.dirname(publicBlogLink), blogDir) || ".";
  fs.symlinkSync(relativeTarget, publicBlogLink, "dir");
}

function cleanupBlogSymlink() {
  if (!fs.existsSync(blogDir) || !fs.existsSync(publicBlogLink)) {
    return;
  }

  if (isSameTargetSymlink(publicBlogLink, blogDir)) {
    fs.unlinkSync(publicBlogLink);
  }
}

ensureBlogSymlink();
process.on("exit", cleanupBlogSymlink);

const viteBin = path.resolve(workspaceRoot, "node_modules/vite/bin/vite.js");
const vite = spawn(process.execPath, [viteBin], {
  cwd: workspaceRoot,
  stdio: "inherit",
  env: process.env,
});

process.on("SIGINT", () => vite.kill("SIGINT"));
process.on("SIGTERM", () => vite.kill("SIGTERM"));

vite.on("exit", (code, signal) => {
  cleanupBlogSymlink();

  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
