import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

function createProjectPaths(currentWorkingDirectory) {
  const workspaceRoot = currentWorkingDirectory;
  return Object.freeze({
    workspaceRoot,
    publicBlogPath: path.resolve(workspaceRoot, "public", "blog"),
    externalBlogPath: path.resolve(workspaceRoot, "..", "blog"),
    viteBinPath: path.resolve(workspaceRoot, "node_modules/vite/bin/vite.js"),
  });
}

function pathExists(targetPath) {
  return fs.existsSync(targetPath);
}

function getPathStatsOrNull(targetPath) {
  if (!pathExists(targetPath)) {
    return null;
  }
  return fs.lstatSync(targetPath);
}

function isDirectorySymlink(targetPath) {
  const stats = getPathStatsOrNull(targetPath);
  return stats ? stats.isSymbolicLink() : false;
}

function isSymlinkTarget(linkPath, expectedTargetPath) {
  if (!isDirectorySymlink(linkPath) || !pathExists(expectedTargetPath)) {
    return false;
  }
  return fs.realpathSync(linkPath) === fs.realpathSync(expectedTargetPath);
}

function unlinkPath(targetPath) {
  fs.unlinkSync(targetPath);
}

function createRelativeDirectorySymlink(linkPath, targetPath) {
  const relativeTarget =
    path.relative(path.dirname(linkPath), targetPath) || ".";
  fs.symlinkSync(relativeTarget, linkPath, "dir");
}

function logWarning(message) {
  console.warn(`[dev] ${message}`);
}

function probeInterruptedRunAndCleanup(paths) {
  if (!pathExists(paths.publicBlogPath)) {
    return;
  }

  if (isSymlinkTarget(paths.publicBlogPath, paths.externalBlogPath)) {
    unlinkPath(paths.publicBlogPath);
  }
}

function ensureExternalBlogExists(paths) {
  if (pathExists(paths.externalBlogPath)) {
    return true;
  }

  logWarning("../blog is missing; blog symlink was not created.");
  return false;
}

function ensurePublicBlogPathCanBeLinked(paths) {
  if (!pathExists(paths.publicBlogPath)) {
    return true;
  }

  if (isDirectorySymlink(paths.publicBlogPath)) {
    logWarning(
      "public/blog exists as a symlink to another target; leaving it unchanged.",
    );
  } else {
    logWarning("public/blog exists as a real directory; leaving it unchanged.");
  }
  return false;
}

function ensureBlogSymlink(paths) {
  if (!ensureExternalBlogExists(paths)) {
    return;
  }

  if (!ensurePublicBlogPathCanBeLinked(paths)) {
    return;
  }

  createRelativeDirectorySymlink(paths.publicBlogPath, paths.externalBlogPath);
}

function cleanupBlogSymlink(paths) {
  if (!pathExists(paths.publicBlogPath)) {
    return;
  }

  if (isSymlinkTarget(paths.publicBlogPath, paths.externalBlogPath)) {
    unlinkPath(paths.publicBlogPath);
  }
}

function spawnVite(paths) {
  return spawn(process.execPath, [paths.viteBinPath], {
    cwd: paths.workspaceRoot,
    stdio: "inherit",
    env: process.env,
  });
}

function forwardSignalToVite(viteProcess, signalName) {
  viteProcess.kill(signalName);
}

function registerProcessHandlers(viteProcess, cleanupHandler) {
  process.on("exit", cleanupHandler);
  process.on("SIGINT", () => forwardSignalToVite(viteProcess, "SIGINT"));
  process.on("SIGTERM", () => forwardSignalToVite(viteProcess, "SIGTERM"));
}

function registerViteExitHandler(viteProcess, cleanupHandler) {
  viteProcess.on("exit", (code, signal) => {
    cleanupHandler();

    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });
}

function run() {
  const paths = createProjectPaths(process.cwd());
  probeInterruptedRunAndCleanup(paths);
  ensureBlogSymlink(paths);

  const cleanupHandler = () => cleanupBlogSymlink(paths);
  const viteProcess = spawnVite(paths);

  registerProcessHandlers(viteProcess, cleanupHandler);
  registerViteExitHandler(viteProcess, cleanupHandler);
}

run();
