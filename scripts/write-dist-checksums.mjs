#!/usr/bin/env node
/**
 * Walks the built `dist/` directory, computes a SHA-256 for every file,
 * and writes a `checksums.txt` manifest.
 *
 * The manifest is written in TWO places:
 *   - `public/checksums.txt`  - committed to git, so the next deploy
 *                               ships it.
 *   - `dist/checksums.txt`    - copied into the deployed `dist/` so the
 *                               site actually serves it.
 *
 * Comparison baseline: the live `https://akinevz.com/checksums.txt` from
 * the previous deployment.  The script fetches it before walking `dist/`
 * and uses those entries as the "prev" values.
 *
 * The remote file is not exposed to crawlers: `public/robots.txt` and the
 * generated `dist/sitemap.xml` both exclude `/checksums.txt`.
 */
import { createHash } from "node:crypto";
import {
    copyFile,
    mkdir,
    readdir,
    readFile,
    writeFile,
} from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "..");
const distRoot = resolve(projectRoot, "dist");
const publicRoot = resolve(projectRoot, "public");
const distChecksumsPath = resolve(distRoot, "checksums.txt");
const publicChecksumsPath = resolve(publicRoot, "checksums.txt");

/** Where the previous deployment's manifest lives. */
const REMOTE_CHECKSUMS_URL =
    process.env.CHECKSUMS_URL || "https://akinevz.com/checksums.txt";

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
    const content = await readFile(filePath, "utf8");
    return createHash("sha256").update(content).digest("hex");
}

/**
 * Parse a manifest of the form:
 *   `<sha256>  <relative-path>`
 * Two or more spaces separate the digest from the path.
 */
function parseChecksumsText(text) {
    const entries = new Map();

    for (const line of text.split(/\r?\n/)) {
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
}

async function readRemoteChecksums() {
    if (typeof fetch !== "function") {
        return new Map();
    }

    try {
        const response = await fetch(REMOTE_CHECKSUMS_URL, {
            cache: "no-store",
            headers: { Accept: "text/plain" },
        });
        if (!response.ok) {
            return new Map();
        }
        const text = await response.text();
        return parseChecksumsText(text);
    } catch {
        return new Map();
    }
}

async function run() {
    const files = await walk(distRoot);
    const existing = await readRemoteChecksums();
    const rows = [];
    let index = 0;

    for (const filePath of files.sort()) {
        // Skip the manifest file itself so it doesn't appear in its own diff.
        if (filePath === distChecksumsPath) {
            continue;
        }

        const digest = await sha256File(filePath);
        const relPath = relative(distRoot, filePath).replace(/\\/g, "/");
        const previous = existing.get(relPath);
        const status = !previous
            ? "NEW"
            : previous === digest
                ? "STABLE"
                : "CHANGED";
        index += 1;

        process.stdout.write(
            `${String(index).padStart(3, "0")}. [${status}] ${relPath}\n` +
            `     prev: ${previous ?? "(none)"}\n` +
            `     next: ${digest}\n`,
        );

        rows.push(`${digest}  ${relPath}`);
    }

    const manifest = `${rows.join("\n")}\n`;

    // Write the deployed copy (`dist/checksums.txt`) and the source copy
    // (`public/checksums.txt`) so the next git commit and the next Render
    // deploy both carry the new manifest.
    await mkdir(distRoot, { recursive: true });
    await mkdir(publicRoot, { recursive: true });
    await writeFile(distChecksumsPath, manifest, "utf8");
    await writeFile(publicChecksumsPath, manifest, "utf8");

    // Belt-and-braces: if Vite ever changes how it copies `public/`, the
    // `dist/` copy is the authoritative served artifact, so a final copy
    // keeps the two in sync even if `public/checksums.txt` was deleted
    // before the build ran.
    await copyFile(publicChecksumsPath, distChecksumsPath).catch(() => { });

    process.stdout.write(
        `Wrote ${rows.length} checksums to ${distChecksumsPath}\n` +
        `                and to ${publicChecksumsPath}\n` +
        `Baseline: ${REMOTE_CHECKSUMS_URL}\n`,
    );
}

run().catch((error) => {
    process.stderr.write(
        `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exit(1);
});

console.log("https://akinevz.dev/ was here");
