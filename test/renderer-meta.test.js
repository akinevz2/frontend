import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  personJsonLd,
  softwareJsonLd,
  truncateDescription,
  PERSON_SAME_AS,
} from "../src/renderer/index.ts";
import { withRouteMeta } from "../build/meta.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("descriptions truncate at a word boundary with an ellipsis", () => {
  const short = "my cozy little personal website";
  assert.equal(truncateDescription(short), short);
  const long =
    "the doftiles deployment orchestrator: verifies the WM-stack binaries, " +
    "installs the missing ones through per-distro deploy scripts, runs the " +
    "make install flow and records every step for the deployment ledger";
  const truncated = truncateDescription(long);
  assert.ok(truncated.length <= 160, `length ${truncated.length}`);
  assert.ok(truncated.endsWith("…"), truncated);
  assert.ok(long.startsWith(truncated.slice(0, -1)), "keeps original words");
  assert.ok(!/\s$/.test(truncated.slice(0, -1)), "no trailing space");
});

test("the Person sameAs links are actually present in the content files", () => {
  const contacts = fs.readFileSync(
    path.join(root, "src/content/contacts.json"),
    "utf8",
  );
  const sections = fs.readFileSync(
    path.join(root, "src/content/sections.json"),
    "utf8",
  );
  for (const url of PERSON_SAME_AS) {
    assert.ok(
      contacts.includes(url) || sections.includes(url),
      `sameAs link not in content: ${url}`,
    );
  }
});

test("JSON-LD entities carry no invented fields and parse", () => {
  const person = personJsonLd("https://akinevz.com/");
  assert.deepEqual(Object.keys(person).sort(), [
    "@context",
    "@type",
    "name",
    "sameAs",
    "url",
  ]);
  const software = softwareJsonLd({
    title: "x",
    description: "y",
  });
  assert.deepEqual(Object.keys(software).sort(), [
    "@context",
    "@type",
    "description",
    "name",
  ]);
  const withFields = softwareJsonLd({
    title: "x",
    description: "y",
    github: "https://github.com/a/b",
    lastModified: "2026-11-01",
  });
  assert.deepEqual(withFields, {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    name: "x",
    description: "y",
    codeRepository: "https://github.com/a/b",
    dateModified: "2026-11-01",
  });
  for (const ld of [person, software, withFields]) {
    assert.doesNotThrow(() => JSON.parse(JSON.stringify(ld)));
  }
});

test("head tags rewrite: og:image size matches the real avatar.png", () => {
  const html = withRouteMeta(
    fs.readFileSync(path.join(root, "index.html"), "utf8"),
    { path: "/", title: "t", description: "d" },
  );
  const width = html.match(/og:image:width" content="(\d+)"/)?.[1];
  const height = html.match(/og:image:height" content="(\d+)"/)?.[1];
  const png = fs.readFileSync(path.join(root, "public/avatar.png"));
  assert.equal(Number(width), png.readUInt32BE(16));
  assert.equal(Number(height), png.readUInt32BE(20));
});

test("head rewrite: Person on /, SoftwareSourceCode on projects, none elsewhere", () => {
  const shell = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const home = withRouteMeta(shell, {
    path: "/",
    title: "t",
    description: "d",
  });
  assert.ok(home.includes('"@type":"Person"'));
  const project = withRouteMeta(shell, {
    path: "/projects/x",
    title: "t",
    description: "d",
    github: "https://github.com/a/b",
    lastModified: "2026-11-01",
  });
  assert.ok(project.includes('"@type":"SoftwareSourceCode"'));
  const alias = withRouteMeta(shell, {
    path: "/x",
    title: "t",
    description: "d",
    hidden: true,
  });
  assert.ok(
    !alias.includes("ld+json") ||
      /<\/script>\s*$/.test(alias.split("ld+json")[1] ?? ""),
    "alias jsonld removed",
  );
  const plain = withRouteMeta(shell, {
    path: "/contact",
    title: "t",
    description: "d",
  });
  assert.ok(!plain.includes('"@type":"SoftwareSourceCode"'));
  assert.ok(!plain.includes('"@type":"Person"'));
});

test("the truncated description lands in the head meta only", () => {
  const shell = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const long = "word ".repeat(60).trim(); // > 160 chars
  const html = withRouteMeta(shell, {
    path: "/x",
    title: "t",
    description: long,
  });
  const meta = html.match(/name="description" content="([^"]*)"/)?.[1];
  assert.ok(meta && meta.length <= 160 && meta.endsWith("…"));
});
