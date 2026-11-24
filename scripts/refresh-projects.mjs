#!/usr/bin/env node
/**
 * The project registry refresh (docs/LEARNING_PLAN.md-adjacent; the
 * soundcloud-refresh pattern applied to the projects pages).
 *
 * The projects pages claim mechanical facts — version numbers, tags,
 * npm dist-versions — that used to be hand-copied across pages and
 * rotted. This script collects those facts from the REGISTRIES the
 * repos actually publish (GitHub tags/releases, npm, the repo's
 * package.json on its default branch) and writes ONE generated file:
 *
 *   src/content/projects/_registry.json
 *
 * Authored project JSON then references facts through tokens
 * ({{registry:<slug>}}) that the shared loader expands — prose stays
 * hand-written, numbers live in exactly one place.
 *
 * Usage:
 *   node scripts/refresh-projects.mjs           # registry-backed
 *   node scripts/refresh-projects.mjs --local   # offline fallback:
 *                                               # ~/dots pins + no tags
 *
 * Never runs at build time (the build stays cheap and side-effect-free);
 * run it when you ship, commit the regenerated registry.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(root, "src/content/projects/_registry.json");
const LOCAL = process.argv.includes("--local");

/** The tracked projects: slug → sources. `npm` is the package name on
 * the registry (null = not published there). `dotsPackage` is the
 * package.json-bearing checkout under ~/dots (null = not a dots part;
 * doftiles IS dots' root and has no package manifest of its own). */
const TRACKED = [
  { slug: "doftiles", repo: "akinevz2/doftiles", npm: null, dotsPackage: null },
  {
    slug: "on-deploy",
    repo: "akinevz2/on-deploy",
    npm: null,
    dotsPackage: "on-deploy/.local/share/on-deploy",
  },
  {
    slug: "herbctl",
    repo: "akinevz2/herbctl",
    npm: "herbctl",
    dotsPackage: "herbctl/.local/share/herbctl",
  },
  {
    slug: "herbstutil",
    repo: "akinevz2/herbstutil",
    npm: "herbstutil",
    dotsPackage: "herbstutil/.local/share/herbstutil",
  },
  {
    slug: "polyframes",
    repo: "akinevz2/polyframes",
    npm: "polyframes",
    dotsPackage: "polyframes/.local/share/polyframes",
  },
  {
    slug: "got-source",
    repo: "akinevz2/got-source",
    npm: null,
    dotsPackage: "get/.local/share/got-source",
  },
  {
    slug: "pagerts",
    repo: "akinevz2/pagerts",
    npm: "pagerts",
    dotsPackage: null,
  },
  {
    slug: "graphbrowser",
    repo: "akinevz2/graphbrowser",
    npm: null,
    dotsPackage: null,
  },
  {
    slug: "lightdni-jssas-toggle",
    repo: "akinevz2/lightdni-jssas-toggle",
    npm: "lightdni-jssas-toggle",
    dotsPackage: null,
  },
  { slug: "rarebert", repo: "akinevz2/rarebert", npm: null, dotsPackage: null },
  {
    slug: "opencode-screencast",
    repo: "akinevz2/opencode-screencast",
    npm: null,
    dotsPackage: null,
  },
  { slug: "frontend", repo: "akinevz2/frontend", npm: null, dotsPackage: null },
  {
    slug: "development",
    repo: "akinevz2/development",
    npm: null,
    dotsPackage: null,
  },
];

const GH = "https://api.github.com";
const GH_HEADERS = {
  Accept: "application/vnd.github+json",
  "User-Agent": "akinevz.com-projects-refresh",
};

async function fetchJson(url, headers = {}) {
  const res = await fetch(url, { headers: { ...GH_HEADERS, ...headers } });
  if (!res.ok) {
    const error = new Error(`HTTP ${res.status} for ${url}`);
    error.status = res.status;
    throw error;
  }
  return res.json();
}

/** The newest tag, via `git ls-remote --tags` — no API, no rate limit,
 * no auth. The listing is alphabetical, so the refs are semver-sorted
 * here (the last ref is NOT the newest). null when the repo has none. */
async function latestTag(repo) {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const run = promisify(execFile);
  const url = `https://github.com/${repo}`;
  const { stdout } = await run("git", ["ls-remote", "--tags", "--refs", url], {
    timeout: 30_000,
  });
  const tags = [...stdout.matchAll(/refs\/tags\/(\S+)$/gm)].map((m) => m[1]);
  if (tags.length === 0) return { tag: null, at: null };
  const newest = tags.sort(semverCompare).at(-1);
  return { tag: newest, at: null };
}

/** The version the repo's package.json declares on its default branch. */
async function manifestVersion(repo) {
  const raw = await fetch(
    `https://raw.githubusercontent.com/${repo}/HEAD/package.json`,
  );
  if (!raw.ok) return null;
  const manifest = await raw.json();
  return typeof manifest.version === "string" ? manifest.version : null;
}

async function npmVersion(name) {
  const res = await fetch(`https://registry.npmjs.org/${name}/latest`);
  if (!res.ok) return null; // 404 = not published; that is a fact, not an error
  const manifest = await res.json();
  return typeof manifest.version === "string" ? manifest.version : null;
}

/** Offline fallback: the version ~/dots currently has checked out. */
function localManifestVersion(dotsPackage) {
  if (!dotsPackage) return null;
  const file = path.join("/home/kine/dots", dotsPackage, "package.json");
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")).version ?? null;
  } catch {
    return null;
  }
}

/** Semver-ish compare (numeric parts; no prerelease handling needed
 * for this fleet). Returns >0 when a is newer. */
const semverCompare = (a, b) => {
  const pa = a.replace(/^v/, "").split(".").map(Number);
  const pb = b.replace(/^v/, "").split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
};

/** "v1.17.1" → "1.17.1"; null passthrough. */
const tagVersion = (tag) => (tag ? tag.replace(/^v/, "") : null);

const projects = {};
const failures = [];

for (const tracked of TRACKED) {
  const entry = {
    repo: tracked.repo,
    tag: null,
    tagAt: null,
    manifestVersion: null,
    npm: null,
  };
  try {
    if (LOCAL) {
      entry.manifestVersion = localManifestVersion(tracked.dotsPackage);
    } else {
      const tag = await latestTag(tracked.repo);
      entry.tag = tag.tag;
      entry.tagAt = tag.at;
      entry.manifestVersion = await manifestVersion(tracked.repo);
      if (tracked.npm) entry.npm = await npmVersion(tracked.npm);
    }
  } catch (cause) {
    failures.push(`${tracked.slug}: ${cause.message}`);
    continue;
  }
  // The expansion value: the manifest version is the implementation's
  // own declaration (what "in sync with the implementation" means);
  // the git tag and npm are the fallbacks when no manifest exists.
  // When the tag LAGS the manifest, that is release-discipline drift —
  // reported, not silently claimed.
  const bare = entry.manifestVersion ?? entry.npm ?? null;
  entry.version = bare ? `v${bare}` : (entry.tag ?? null);
  if (
    entry.manifestVersion &&
    entry.tag &&
    semverCompare(tagVersion(entry.tag), entry.manifestVersion) < 0
  ) {
    entry.drift = `the tag (${entry.tag}) lags the manifest (v${entry.manifestVersion}) — tag the release`;
    console.warn(`refresh-projects: ${tracked.slug}: ${entry.drift}`);
  }
  projects[tracked.slug] = entry;
}

if (failures.length > 0) {
  // The existing registry file stays untouched — a partial refresh
  // would silently mix old and new facts.
  console.error("refresh-projects: FAILED — no file written:");
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}

const registry = {
  source: LOCAL
    ? "local: ~/dots submodule pins (--local mode)"
    : "github.com/akinevz2 (tags/releases) + raw package.json + registry.npmjs.org",
  generatedAt: new Date().toISOString(),
  mode: LOCAL ? "local" : "registry",
  projects,
};

fs.writeFileSync(OUT, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
console.log(
  `refresh-projects: wrote ${OUT} (${Object.keys(projects).length} projects, mode=${registry.mode})`,
);
