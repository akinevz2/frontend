#!/usr/bin/env node
import { run as generateSoundcloud } from "./generate-soundcloud-json.mjs";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "..");

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

async function run() {
    await freezeBlogContent();
    await generateSoundcloud();
}

run().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
});
