import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const scripts = pkg.scripts;
const renderYaml = readFileSync("render.yaml", "utf8");
const ciYml = readFileSync(".github/workflows/ci.yml", "utf8");

/**
 * The deploy end (Render) must stay cheap and side-effect-free: it builds
 * the committed tree and statically gates on the committed drift report.
 * Everything expensive or stateful — content refresh, checksums, live
 * baseline fetches — belongs to `build:gated` (CI, build:local) only.
 */
test("the deploy build neither regenerates content nor runs the checksums pipeline", () => {
  const build = scripts.build;
  assert.match(build, /vite build/);
  assert.doesNotMatch(build, /checksums/);
  assert.doesNotMatch(build, /refresh/);
});

test("build:gated is the full pipeline: build + checksums", () => {
  assert.equal(scripts["build:gated"], "npm run build && npm run checksums");
});

test("build:local refreshes soundcloud, then gated build, then the gate", () => {
  const local = scripts["build:local"];
  assert.match(local, /refresh:content/);
  assert.match(local, /refresh:soundcloud/);
  const refreshAt = local.indexOf("refresh:soundcloud");
  const gatedAt = local.indexOf("build:gated");
  const gateAt = local.indexOf("verify:policy");
  assert.ok(refreshAt !== -1 && gatedAt !== -1 && gateAt !== -1);
  assert.ok(refreshAt < gatedAt, "content refresh must precede the build");
  assert.ok(gatedAt < gateAt, "the gate must consume the fresh drift report");
});

test("build:local commits the refreshed snapshot before the dev preview", () => {
  // npm run dev blocks forever; if it ran before `git add -A && git commit`
  // the refreshed snapshots (soundcloud.json, checksums, drift report)
  // would never be committed and the deployed site would trail releases.
  const local = scripts["build:local"];
  const commitAt = local.indexOf("git commit");
  const devAt = local.indexOf("npm run dev");
  assert.ok(commitAt !== -1 && devAt !== -1);
  assert.ok(commitAt < devAt, "commit must precede the blocking dev server");
});

test("check:ci mirrors the CI subset with the gated build", () => {
  assert.match(scripts["check:ci"], /build:gated/);
  assert.match(scripts["check:ci"], /verify:policy/);
});

test("CI runs the gated build so the drift report is recomputed there", () => {
  assert.match(ciYml, /npm run build:gated/);
});

test("Render statically gates on the uploaded report before any install", () => {
  const commandLine = renderYaml
    .split("\n")
    .find((line) => line.trim().startsWith("buildCommand:"));
  assert.ok(commandLine, "render.yaml must declare a buildCommand");
  // The static gate runs before npm install: a failing report aborts the
  // deploy before spending any real compute.
  const gateAt = commandLine.indexOf("npm run verify:policy");
  const installAt = commandLine.indexOf("npm install");
  assert.ok(gateAt !== -1, "deploy must statically check the drift report");
  assert.ok(installAt !== -1 && gateAt < installAt);
  // And it must not re-run the pipeline it gated.
  assert.doesNotMatch(commandLine, /checksums/);
  assert.doesNotMatch(commandLine, /refresh/);
});
