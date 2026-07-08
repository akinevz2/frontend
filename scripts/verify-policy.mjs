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

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

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

async function readJson(relativePath) {
    const filePath = resolve(projectRoot, relativePath);
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw);
}

function assertAllowedKeys(value, allowedKeys, context) {
    const keys = Object.keys(value);
    const extras = keys.filter((key) => !allowedKeys.has(key));
    assert(extras.length === 0, `${context}: unexpected keys: ${extras.join(", ")}`);
}

function assertSafeLink(value, context) {
    assert(typeof value === "string", `${context}: link must be string`);
    const trimmed = value.trim();
    assert(trimmed.length > 0, `${context}: link cannot be empty`);
    assert(!/^javascript:/i.test(trimmed), `${context}: javascript: links are forbidden`);
    assert(!/^data:/i.test(trimmed), `${context}: data: links are forbidden`);
    assert(/^\//.test(trimmed) || /^https?:\/\//.test(trimmed), `${context}: link must be absolute http(s) URL or internal path`);
}

function validateSectionNode(node, context, options = {}) {
    assert(node && typeof node === "object" && !Array.isArray(node), `${context}: must be object`);

    const allowed = new Set([
        "all",
        "style",
        "styles",
        "className",
        "heading",
        "content",
        "link",
        "printout",
        "depth",
        "uuid",
        ...(options.allowAddonFields ? ["status", "text"] : []),
    ]);
    assertAllowedKeys(node, allowed, context);

    if ("heading" in node) {
        assert(typeof node.heading === "string", `${context}.heading must be string`);
    }
    if ("className" in node) {
        assert(typeof node.className === "string", `${context}.className must be string`);
    }
    if ("status" in node) {
        assert(typeof node.status === "string", `${context}.status must be string`);
    }
    if ("text" in node) {
        assert(typeof node.text === "string", `${context}.text must be string`);
    }
    if ("link" in node) {
        assertSafeLink(node.link, `${context}.link`);
    }
    if ("printout" in node) {
        const value = node.printout;
        assert(
            typeof value === "string" || (Array.isArray(value) && value.every((item) => typeof item === "string")),
            `${context}.printout must be string or string[]`,
        );
    }

    if (!("content" in node)) {
        return;
    }

    const content = node.content;
    assert(typeof content === "string" || Array.isArray(content), `${context}.content must be string or array`);

    if (Array.isArray(content)) {
        content.forEach((item, index) => {
            if (typeof item === "string") {
                return;
            }
            validateSectionNode(item, `${context}.content[${index}]`, options);
        });
    }
}

function validatePages(value) {
    assert(Array.isArray(value), "src/pages.json must be an array");

    value.forEach((page, index) => {
        const context = `src/pages.json[${index}]`;
        assert(page && typeof page === "object" && !Array.isArray(page), `${context}: must be object`);
        assertAllowedKeys(page, new Set(["path", "menuLabel", "title", "description"]), context);
        assert(typeof page.path === "string", `${context}.path must be string`);
        assert(page.path.startsWith("/"), `${context}.path must start with '/'`);
        assert(typeof page.menuLabel === "string", `${context}.menuLabel must be string`);
        assert(typeof page.title === "string", `${context}.title must be string`);
        assert(typeof page.description === "string", `${context}.description must be string`);
    });
}

function validateSoundcloud(value) {
    assert(value && typeof value === "object" && !Array.isArray(value), "public/soundcloud.json must be object");
    assert(typeof value.source === "string", "public/soundcloud.json.source must be string");
    assert(typeof value.generatedAt === "string", "public/soundcloud.json.generatedAt must be string");
    assert(typeof value.trackCount === "number", "public/soundcloud.json.trackCount must be number");
    assert(Array.isArray(value.tracks), "public/soundcloud.json.tracks must be array");

    value.tracks.forEach((track, index) => {
        const context = `public/soundcloud.json.tracks[${index}]`;
        assert(track && typeof track === "object" && !Array.isArray(track), `${context}: must be object`);
        assertAllowedKeys(track, new Set(["path", "title", "url"]), context);
        assert(typeof track.path === "string", `${context}.path must be string`);
        assert(typeof track.title === "string", `${context}.title must be string`);
        assertSafeLink(track.url, `${context}.url`);
    });
}

function validateBlogPosts(value) {
    if (Array.isArray(value)) {
        value.forEach((item, index) => validateSectionNode(item, `public/blog/posts.json[${index}]`));
        return;
    }

    validateSectionNode(value, "public/blog/posts.json");
}

function validateMusicLinks(value) {
    assert(Array.isArray(value), "public/blog/music-links.json must be an array");
    value.forEach((item, index) => {
        const context = `public/blog/music-links.json[${index}]`;
        assert(item && typeof item === "object" && !Array.isArray(item), `${context}: must be object`);

        const isSimpleLink = "title" in item || "url" in item;
        if (isSimpleLink) {
            assertAllowedKeys(item, new Set(["title", "url"]), context);
            assert(typeof item.title === "string", `${context}.title must be string`);
            assertSafeLink(item.url, `${context}.url`);
            return;
        }

        validateSectionNode(item, context, { allowAddonFields: true });
    });
}

async function checkRuntimePolicy() {
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
        throw new Error(`Runtime remote authored-content references are forbidden:\n${violations.join("\n")}`);
    }
}

async function checkContentSchema() {
    const [pages, contacts, sections, addons, soundcloud, blogPosts, musicLinks] = await Promise.all([
        readJson("src/pages.json"),
        readJson("src/contacts.json"),
        readJson("src/sections.json"),
        readJson("src/addons.json"),
        readJson("public/soundcloud.json"),
        readJson("public/blog/posts.json"),
        readJson("public/blog/music-links.json"),
    ]);

    validatePages(pages);
    validateSectionNode(contacts, "src/contacts.json");
    validateSectionNode(sections, "src/sections.json");
    validateSectionNode(addons, "src/addons.json", { allowAddonFields: true });
    validateSoundcloud(soundcloud);
    validateBlogPosts(blogPosts);
    validateMusicLinks(musicLinks);
}

async function run() {
    await checkRuntimePolicy();
    await checkContentSchema();
    process.stdout.write("Policy verification passed.\n");
}

run().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
});
