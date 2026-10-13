#!/usr/bin/env node
import { run as refreshSoundcloud } from "./refresh-soundcloud.mjs";
import { readdir, readFile, unlink, writeFile } from "node:fs/promises";
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

const contentRoot = resolve(projectRoot, "src/content");

/** Every structural JSON file under src/content (recursively). */
async function listContentJson(dir = contentRoot) {
    const entries = await readdir(dir, { withFileTypes: true });
    const nested = await Promise.all(
        entries.map((entry) =>
            entry.isDirectory()
                ? listContentJson(resolve(dir, entry.name))
                : entry.name.endsWith(".json")
                  ? [resolve(dir, entry.name)]
                  : [],
        ),
    );
    return nested.flat();
}

async function validateLocalContent() {
    for (const inputPath of await listContentJson()) {
        const content = await readFile(inputPath, "utf8");
        JSON.parse(content);

        // Normalize trailing newline so build outputs remain stable.
        await writeFile(inputPath, `${content.trim()}\n`, "utf8");
        process.stdout.write(`Validated local content: ${inputPath}\n`);
    }
}

export async function run() {
    await unlink(driftReportPath).catch((error) => {
        if (!(error && typeof error === "object" && "code" in error && error.code === "ENOENT")) {
            throw error;
        }
    });
    await validateLocalContent();
    await refreshSoundcloud();
}

const isDirectExecution =
    process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isDirectExecution) {
    run().catch((error) => {
        process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
        process.exit(1);
    });
}
