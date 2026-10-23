import assert from "node:assert/strict";
import { test } from "node:test";
import { decodeReport, evaluateReport } from "../scripts/verify-policy.mjs";

const validReport = {
  baselineUrl: "https://akinevz.com/checksums.txt",
  generatedAt: "2026-10-23T21:05:17.711Z",
  violationCount: 1,
  violations: [
    {
      relPath: "configs.html",
      status: "CHANGED",
      prev: "5f3cbfba",
      next: "6ccf146d",
      resolution: "content-drift",
    },
  ],
};

test("decode accepts a well-formed drift report", () => {
  const decoded = decodeReport(validReport);
  assert.equal(decoded.ok, true);
  assert.equal(decoded.ok && decoded.report.violationCount, 1);
});

test("decode fails closed on missing required fields", () => {
  const decoded = decodeReport({ violations: [], violationCount: 0 });
  assert.equal(decoded.ok, false);
  assert.ok(decoded.ok === false && decoded.issues.length >= 2);
});

test("decode rejects a violationCount that disagrees with the array", () => {
  const decoded = decodeReport({ ...validReport, violationCount: 0 });
  assert.equal(decoded.ok, false);
  assert.ok(
    decoded.ok === false && decoded.issues.join(" ").includes("violationCount"),
  );
});

test("decode rejects violations entries without relPath or resolution", () => {
  const decoded = decodeReport({
    ...validReport,
    violationCount: 2,
    violations: [{ status: "CHANGED" }, { relPath: "x.html" }],
  });
  assert.equal(decoded.ok, false);
  assert.ok(decoded.ok === false && decoded.issues.length === 2);
});

test("decode rejects non-object payloads", () => {
  assert.equal(decodeReport("nope").ok, false);
  assert.equal(decodeReport([]).ok, false);
  assert.equal(decodeReport(null).ok, false);
});

test("evaluate passes an empty violations array", () => {
  const empty = { ...validReport, violationCount: 0, violations: [] };
  const evaluation = evaluateReport(empty);
  assert.equal(evaluation.ok, true);
  assert.equal(evaluation.reasons.length, 0);
});

test("evaluate fails on genuine content drift", () => {
  const evaluation = evaluateReport(validReport);
  assert.equal(evaluation.ok, false);
  assert.ok(evaluation.reasons[0].includes("configs.html"));
  assert.ok(evaluation.reasons[0].includes("content-drift"));
});

test("evaluate fails on reconciled resolutions inside violations", () => {
  const evaluation = evaluateReport({
    ...validReport,
    violations: [{ relPath: "wow.html", resolution: "rehash-only" }],
  });
  assert.equal(evaluation.ok, false);
  assert.ok(evaluation.reasons[0].includes("generator regression"));
});

test("evaluate treats unverifiable artifacts as drift", () => {
  const evaluation = evaluateReport({
    ...validReport,
    violations: [
      {
        relPath: "resume/index.html",
        status: "NEW",
        resolution: "unverifiable",
      },
    ],
  });
  assert.equal(evaluation.ok, false);
  assert.ok(evaluation.reasons[0].includes("unverifiable"));
});
