#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "..");
const distRoot = resolve(projectRoot, "dist");
const checksumsPath = resolve(distRoot, "checksums.txt");

async function walk(dirPath) {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = resolve(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
      continue;
    }

    if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

async function sha256File(filePath) {
  const content = await readFile(filePath);
  return createHash("sha256").update(content).digest("hex");
}

async function run() {
  const files = await walk(distRoot);
  const rows = [];

  for (const filePath of files.sort()) {
    if (filePath === checksumsPath) {
      continue;
    }

    const digest = await sha256File(filePath);
    const relPath = relative(distRoot, filePath).replace(/\\/g, "/");
    rows.push(`${digest}  ${relPath}`);
  }

  await writeFile(checksumsPath, `${rows.join("\n")}\n`, "utf8");
  process.stdout.write(`Wrote ${rows.length} checksums to ${checksumsPath}\n`);
}

run().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
