#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "..");
const srcRoot = resolve(projectRoot, "src");
const runtimeRoots = [resolve(srcRoot, "components"), resolve(srcRoot, "windowing")];
const runtimeTopLevelFiles = [resolve(srcRoot, "App.tsx")];

const bannedPatterns = [
  /raw\.githubusercontent\.com/i,
  /getRuntimeBlogPostsHost\s*\(/,
  /resolveTrustedBlogAssetUrl\s*\(/,
];

async function walk(dirPath) {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = resolve(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
      continue;
    }

    if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

async function run() {
  const filesByDir = await Promise.all(runtimeRoots.map((dirPath) => walk(dirPath)));
  const files = [...runtimeTopLevelFiles, ...filesByDir.flat()];
  const violations = [];

  for (const filePath of files) {
    const source = await readFile(filePath, "utf8");
    for (const pattern of bannedPatterns) {
      if (pattern.test(source)) {
        violations.push(`${filePath}: matches ${pattern}`);
      }
    }
  }

  if (violations.length > 0) {
    process.stderr.write(
      `Runtime remote authored-content references are forbidden:\n${violations.join("\n")}\n`,
    );
    process.exit(1);
  }

  process.stdout.write("No runtime remote authored-content references found.\n");
}

run().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
