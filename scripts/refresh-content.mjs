#!/usr/bin/env node
import { run as refreshSoundcloud } from "./refresh-soundcloud.mjs";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "..");

/**
 * Stale documents/drift-report.json is removed at the start of every refresh cycle so
 * that `verify:policy` (which may run before `checksums`) does not act on a
 * report produced by a previous build.  The checksums step rewrites it.
 */
const driftReportPath = resolve(projectRoot, "public", "documents", "drift-report.json");

const LOCAL_SOURCES = [
    {
        inputPath: resolve(projectRoot, "public/blog/posts.json"),
    },
    {
        inputPath: resolve(projectRoot, "public/blog/music-links.json"),
    },
];

async function freezeBlogContent() {
    for (const source of LOCAL_SOURCES) {
        const content = await readFile(source.inputPath, "utf8");
        JSON.parse(content);

        // Normalize trailing newline so build outputs remain stable.
        await writeFile(source.inputPath, `${content.trim()}\n`, "utf8");
        process.stdout.write(`Validated local content: ${source.inputPath}\n`);
    }
}

export async function run() {
    await unlink(driftReportPath).catch((error) => {
        if (!(error && typeof error === "object" && "code" in error && error.code === "ENOENT")) {
            throw error;
        }
    });
    await freezeBlogContent();
    await refreshSoundcloud();
}

const isDirectExecution =
    process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isDirectExecution) {
    process.stderr.write('Hello world :) <boom>')
}
run().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
});
