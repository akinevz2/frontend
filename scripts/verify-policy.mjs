#!/usr/bin/env node
/**
 * CI drift gate for the checksums pipeline.
 *
 * Reads the sidecar `public/documents/drift-report.json` that
 * write-dist-checksums.mjs emits during the build and fails when the
 * build observed genuine STABLE-invariant drift relative to the live
 * deployment baseline:
 *
 *   - a non-empty `violations` array (content drift or an artifact that
 *     could not be verified against the live counterpart), or
 *   - a corrupt/inconsistent report (`violationCount` disagreeing with
 *     the `violations` array, reconciled resolutions inside `violations`,
 *     missing fields) — the gate fails closed on those.
 *
 * Rebuild noise that write-dist-checksums.mjs already reconciled against
 * the live deployment (`rehash-only`, `live-match`) is NOT a failure; it
 * is printed for observability only.
 *
 * The gate runs in CI (where the remote baseline is reachable) rather
 * than only locally.  On pull requests it runs in advisory mode so that
 * legitimate content edits under review do not block CI — pass
 * `--nonblocking` (or set `VERIFY_POLICY_NONBLOCKING=1`) to downgrade
 * genuine-drift findings to warnings.  A missing or corrupt report is
 * always a hard failure: an indefinite signal cannot gate anything.
 */

import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const driftReportPath = resolve(
  projectRoot,
  "public",
  "documents",
  "drift-report.json",
);

/** Reconciled resolutions must never appear inside `violations`. */
const RECONCILED_RESOLUTIONS = new Set(["rehash-only", "live-match"]);

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Decode the drift report.  Unknown shape fails closed.
 * Returns `{ ok: true, report }` or `{ ok: false, issues }`.
 */
export function decodeReport(value) {
  if (!isRecord(value)) {
    return { ok: false, issues: ["drift report is not a JSON object"] };
  }

  const issues = [];
  const { baselineUrl, generatedAt, violationCount, violations } = value;

  if (typeof baselineUrl !== "string" || baselineUrl.length === 0) {
    issues.push("baselineUrl is missing or not a non-empty string");
  }
  if (typeof generatedAt !== "string" || generatedAt.length === 0) {
    issues.push("generatedAt is missing or not a non-empty string");
  }
  if (
    typeof violationCount !== "number" ||
    !Number.isInteger(violationCount) ||
    violationCount < 0
  ) {
    issues.push("violationCount is missing or not a non-negative integer");
  }
  if (!Array.isArray(violations)) {
    issues.push("violations is missing or not an array");
  }
  if (issues.length > 0) {
    return { ok: false, issues };
  }

  for (const [index, entry] of violations.entries()) {
    if (!isRecord(entry) || typeof entry.relPath !== "string") {
      issues.push(`violations[${index}] has no relPath`);
      continue;
    }
    if (typeof entry.resolution !== "string") {
      issues.push(`violations[${index}] (${entry.relPath}) has no resolution`);
    }
  }
  if (violationCount !== violations.length) {
    issues.push(
      `violationCount (${violationCount}) does not match ` +
        `violations length (${violations.length})`,
    );
  }

  return issues.length === 0
    ? {
        ok: true,
        report: { baselineUrl, generatedAt, violationCount, violations },
      }
    : { ok: false, issues };
}

/**
 * Evaluate a decoded report.  Returns `{ ok, reasons }` where `reasons`
 * is empty exactly when there is no genuine drift.
 */
export function evaluateReport(report) {
  const reasons = [];
  for (const entry of report.violations) {
    if (RECONCILED_RESOLUTIONS.has(entry.resolution)) {
      reasons.push(
        `${entry.relPath}: reconciled resolution "${entry.resolution}" ` +
          `must not appear in violations (generator regression)`,
      );
      continue;
    }
    const note = entry.note ? ` — ${entry.note}` : "";
    reasons.push(
      `${entry.relPath}: ${entry.status ?? "unknown"} ${entry.resolution}${note}`,
    );
  }
  return { ok: reasons.length === 0, reasons };
}

function observabilityLines(report) {
  const rehashOnly = Array.isArray(report.rehashOnly) ? report.rehashOnly : [];
  const liveMatched = Array.isArray(report.liveMatched)
    ? report.liveMatched
    : [];
  return [
    `rebuild noise reconciled against live: ${rehashOnly.length} rehash-only, ` +
      `${liveMatched.length} live-match (not drift)`,
  ];
}

async function main() {
  const nonblocking =
    process.argv.includes("--nonblocking") ||
    process.env.VERIFY_POLICY_NONBLOCKING === "1";

  let raw;
  try {
    raw = await readFile(driftReportPath, "utf8");
  } catch {
    process.stderr.write(
      `Drift policy FAIL — drift report not found at ${driftReportPath}. ` +
        `The build pipeline (write-dist-checksums.mjs) must run first so ` +
        `the gate consumes a definite signal.\n`,
    );
    process.exit(1);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    process.stderr.write(
      `Drift policy FAIL — drift report at ${driftReportPath} is not valid ` +
        `JSON: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exit(1);
  }

  const decoded = decodeReport(parsed);
  if (!decoded.ok) {
    process.stderr.write(
      `Drift policy FAIL — drift report at ${driftReportPath} failed validation:\n` +
        decoded.issues.map((issue) => `  ${issue}`).join("\n") +
        "\n",
    );
    process.exit(1);
  }

  const { report } = decoded;
  const evaluation = evaluateReport(report);
  const observability = observabilityLines(report).map((line) => `  ${line}`);

  if (evaluation.ok) {
    process.stdout.write(
      `Drift policy PASS — ${report.violationCount} violation(s) vs ${report.baselineUrl}\n` +
        `${observability.join("\n")}\n` +
        `Report generated at ${report.generatedAt}\n`,
    );
    process.exit(0);
  }

  const verdict = nonblocking ? "WARN (nonblocking)" : "FAIL";
  const stream = nonblocking ? process.stdout : process.stderr;
  stream.write(
    `Drift policy ${verdict} — ${report.violationCount} genuine drift ` +
      `artifact(s) vs ${report.baselineUrl}:\n` +
      evaluation.reasons.map((reason) => `  ${reason}`).join("\n") +
      "\n" +
      `${observability.join("\n")}\n` +
      `Report generated at ${report.generatedAt}\n`,
  );
  process.exit(nonblocking ? 0 : 1);
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  pathToFileURL(process.argv[1]).href === import.meta.url;

if (invokedDirectly) {
  main();
}
