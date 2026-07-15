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

async function readExistingChecksums() {
    try {
        const content = await readFile(checksumsPath, "utf8");
        const entries = new Map();

        for (const line of content.split(/\r?\n/)) {
            const trimmed = line.trim();
            if (!trimmed) {
                continue;
            }

            const [digest, relPath] = trimmed.split(/\s{2,}/);
            if (!digest || !relPath) {
                continue;
            }

            entries.set(relPath, digest);
        }

        return entries;
    } catch (error) {
        const code = error && typeof error === "object" ? error.code : undefined;
        if (code === "ENOENT") {
            return new Map();
        }
        throw error;
    }
}

async function run() {
    const files = await walk(distRoot);
    const rows = [];
    const existing = await readExistingChecksums();
    let index = 0;

    for (const filePath of files.sort()) {
        if (filePath === checksumsPath) {
            continue;
        }

        const digest = await sha256File(filePath);
        const relPath = relative(distRoot, filePath).replace(/\\/g, "/");
        const previous = existing.get(relPath);
        const status = !previous
            ? "NEW"
            : previous === digest
                ? "STABLE"
                : "UNCHANGED";
        index += 1;

        process.stdout.write(
            `${String(index).padStart(3, "0")}. [${status}] ${relPath}\n` +
            `     prev: ${previous ?? "(none)"}\n` +
            `     next: ${digest}\n`,
        );

        rows.push(`${digest}  ${relPath}`);
    }

    await writeFile(checksumsPath, `${rows.join("\n")}\n`, "utf8");
    process.stdout.write(`Wrote ${rows.length} checksums to ${checksumsPath}\n`);
}

run().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
});

console.log("https://akinevz.dev/ was here")