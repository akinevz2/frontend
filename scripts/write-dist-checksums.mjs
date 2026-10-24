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
import {
  canonicalizeAssetRefs,
  isCanonicalizablePath,
} from "./asset-reference.mjs";
import { isMutablePath, MUTABLE_PATH_SET } from "./mutable-assets.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "..");
const distRoot = resolve(projectRoot, "dist");
const publicRoot = resolve(projectRoot, "public");
const distChecksumsPath = resolve(distRoot, "checksums.txt");
const publicChecksumsPath = resolve(publicRoot, "checksums.txt");
const generatedManifestPath = resolve(distRoot, ".generated.json");

/**
 * Sidecar written next to `checksums.txt` capturing any STABLE-invariant
 * violations observed during this run.  `verify-policy.mjs` reads it so the
 * drift gate runs in CI (where the remote baseline is reachable) rather
 * than only locally.  An empty violations array means "no drift".
 */
const driftReportPath = resolve(publicRoot, "documents", "drift-report.json");

/** Where the previous deployment's manifest lives. */
const REMOTE_CHECKSUMS_URL =
  process.env.CHECKSUMS_URL || "https://akinevz.com/checksums.txt";

/** Directory of the remote manifest; built artifacts are fetched here. */
const REMOTE_BASE_URL = REMOTE_CHECKSUMS_URL.replace(/checksums\.txt$/, "");

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

async function sha256Text(text) {
  return createHash("sha256").update(text).digest("hex");
}

/**
 * Fetch the previously deployed counterpart of a built artifact.
 *
 * Returns null when the remote is unreachable or the file does not exist
 * there yet — the caller then treats the artifact as unverifiable.
 */
async function fetchLiveCounterpart(relPath, cache) {
  if (cache.has(relPath)) {
    return cache.get(relPath);
  }

  let live = null;
  if (typeof fetch === "function") {
    try {
      const response = await fetch(`${REMOTE_BASE_URL}${encodeURI(relPath)}`, {
        cache: "no-store",
        headers: { Accept: "text/plain" },
      });
      if (response.ok) {
        live = await response.text();
      }
    } catch {
      live = null;
    }
  }
  cache.set(relPath, live);
  return live;
}

/**
 * Decide whether a non-STABLE non-mutable artifact actually drifted.
 *
 * Vite rebuilds every HTML entry page whenever any bundle's content hash
 * changes, so raw byte comparison reports false drift on unchanged pages.
 * Two false-positive classes are resolved against the live deployment:
 *
 *   - "live-match": the artifact is byte-identical to the live file but
 *     the baseline manifest predates it (baseline staleness).
 *   - "rehash-only": the page differs only in the content-hashed asset
 *     references Vite re-injects at build time.
 *
 * Anything else — including an unfetchable counterpart — is treated as
 * real drift, the loud failure mode.
 */
function classifyDrift({ relPath, localText, liveText }) {
  const localCanonical = isCanonicalizablePath(relPath)
    ? canonicalizeAssetRefs(localText)
    : localText;

  if (liveText === null) {
    return {
      drift: true,
      resolution: "unverifiable",
      note: "no counterpart at the baseline URL",
    };
  }

  if (localText === liveText) {
    return { drift: false, resolution: "live-match" };
  }

  if (localCanonical === canonicalizeAssetRefs(liveText)) {
    return { drift: false, resolution: "rehash-only" };
  }

  return { drift: true, resolution: "content-drift" };
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

/**
 * Read the generated-artifact manifest that routeSkeletonsPlugin emits
 * (`dist/.generated.json`): every webapp-generated path it lists is
 * auto-marked mutable, so new routes and project pages never need a
 * hand-maintained mutable entry.
 *
 * Fail-loud policy: an existing but corrupt manifest throws (a build
 * tooling regression must not silently downgrade the gate); a missing
 * manifest only notes it — pages then fall back to the denylist in
 * mutable-assets.mjs and the live-reconcile in the drift gate.
 */
async function readGeneratedPaths() {
  let raw;
  try {
    raw = await readFile(generatedManifestPath, "utf8");
  } catch {
    process.stdout.write(
      `Note: no generated-artifact manifest at dist/.generated.json — ` +
        `generated pages are not auto-marked mutable (run vite build first)\n`,
    );
    return new Set();
  }

  const parsed = JSON.parse(raw);
  const list =
    parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed.generated
      : null;
  if (!Array.isArray(list) || list.some((p) => typeof p !== "string")) {
    throw new Error(
      `corrupt generated-artifact manifest: ` +
        `${relative(projectRoot, generatedManifestPath)} must be ` +
        `{ "generated": string[] }`,
    );
  }
  return new Set(list);
}

async function run() {
  const files = await walk(distRoot);
  const existing = await readRemoteChecksums();
  const generatedPaths = await readGeneratedPaths();
  const rows = [];
  let index = 0;
  const driftViolations = [];
  const rehashOnly = [];
  const liveMatched = [];
  const liveCounterparts = new Map();

  for (const filePath of files.sort()) {
    // Skip the manifest file itself and the generated-artifact manifest so
    // neither appears in its own diff.
    if (filePath === distChecksumsPath || filePath === generatedManifestPath) {
      continue;
    }

    const localText = await readFile(filePath, "utf8");
    const digest = await sha256Text(localText);
    const relPath = relative(distRoot, filePath).replace(/\\/g, "/");
    const previous = existing.get(relPath);
    const status = !previous
      ? "NEW"
      : previous === digest
        ? "STABLE"
        : "CHANGED";
    const generated = generatedPaths.has(relPath);
    const mutable = generated || isMutablePath(relPath);
    const tag = generated ? " (generated)" : mutable ? " (mutable)" : "";
    index += 1;

    process.stdout.write(
      `${String(index).padStart(3, "0")}. [${status}] ${relPath}${tag}\n` +
        `     prev: ${previous ?? "(none)"}\n` +
        `     next: ${digest}\n`,
    );

    // Drift gate: a non-mutable artifact MUST be STABLE relative to the
    // remote baseline.  A mutable artifact may be STABLE, CHANGED, or NEW.
    //
    // Rebuild noise is resolved against the live deployment before it is
    // counted as a violation: Vite re-injects content-hashed asset refs
    // into every HTML entry page, and the baseline manifest can lag the
    // live site, so raw byte comparison alone reports false drift.
    if (!mutable && status !== "STABLE") {
      const liveText = await fetchLiveCounterpart(relPath, liveCounterparts);
      const drift = classifyDrift({ relPath, localText, liveText });

      if (drift.drift) {
        driftViolations.push({
          relPath,
          status,
          prev: previous ?? null,
          next: digest,
          resolution: drift.resolution,
          ...(drift.note ? { note: drift.note } : {}),
        });
      } else if (drift.resolution === "rehash-only") {
        rehashOnly.push(relPath);
      } else {
        liveMatched.push(relPath);
      }

      process.stdout.write(`     drift: ${drift.resolution}\n`);
    }

    rows.push(`${digest}  ${relPath}`);
  }

  // Always emit a drift report so verify-policy can consume a definite
  // signal rather than relying on file presence.  `violations` contains
  // only genuine content drift; rebuild noise that was reconciled against
  // the live deployment is recorded separately for observability.
  const driftReport = JSON.stringify(
    {
      baselineUrl: REMOTE_CHECKSUMS_URL,
      generatedAt: new Date().toISOString(),
      mutablePaths: [...MUTABLE_PATH_SET],
      generatedPaths: [...generatedPaths].sort(),
      violationCount: driftViolations.length,
      violations: driftViolations,
      rehashOnlyCount: rehashOnly.length,
      rehashOnly,
      liveMatchCount: liveMatched.length,
      liveMatched,
    },
    null,
    2,
  );
  await writeFile(driftReportPath, `${driftReport}\n`, "utf8");

  if (rehashOnly.length > 0) {
    process.stdout.write(
      `Drift gate: ${rehashOnly.length} rebuilt artifact(s) differ only in ` +
        `Vite's injected asset hashes (rehash-only, not drift)\n`,
    );
  }
  if (liveMatched.length > 0) {
    process.stdout.write(
      `Drift gate: ${liveMatched.length} artifact(s) match the live site but ` +
        `are missing from the baseline manifest (live-match, not drift)\n`,
    );
  }

  if (driftViolations.length > 0) {
    const lines = driftViolations.map((v) => {
      const note = v.note ? ` — ${v.note}` : "";
      return `  ${v.relPath}: ${v.status} ${v.resolution}${note} (prev=${v.prev ?? "(none)"})`;
    });
    process.stderr.write(
      `Drift gate failed — ${driftViolations.length} non-mutable artifact(s) changed ` +
        `vs ${REMOTE_CHECKSUMS_URL}:\n${lines.join("\n")}\n`,
    );
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
  await copyFile(publicChecksumsPath, distChecksumsPath).catch(() => {});

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
