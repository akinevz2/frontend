/** THE mdSection — the single copy of the markdown-file → Section
 * wrapper (the mirror that lived in src/seo/prerender.tsx is deleted;
 * everything imports this one). `docs/LEARNING_PLAN.md` §3.
 *
 * `mdSection` is the base wrapper (a leading `# Heading` names the
 * window; everything else is prose). `mdLessonSection` extends it with
 * the §5 heading convention for LESSON files only — a depth ≥ 2 heading
 * whose text starts with `hint:`, `advice:` or `ref:` (case-insensitive)
 * opens a nested Section of that kind. Fenced code blocks are never
 * scanned. Non-lesson markdown keeps using the base wrapper, so blog
 * posts render byte-identically. */

import type { Item, Section } from "@/content/schema";

/** "make-recipes" → "Make recipes". */
export const humanize = (stem: string): string =>
  stem.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());

export const stemOf = (publicPath: string): string =>
  publicPath
    .split("/")
    .pop()!
    .replace(/\.json$|\.md$/, "");

/**
 * Wrap an include/ markdown file as a Section: `# Heading` first line
 * names the window (default: humanized stem); the rest is the content.
 */
export const mdSection = (stem: string, md: string): Section => {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  let heading: string | undefined;
  while (heading === undefined && lines.length > 0) {
    const line = lines[0] ?? "";
    if (line.trim() === "") lines.shift();
    else if (line.startsWith("# ")) {
      heading = line.slice(2).trim();
      lines.shift();
    } else break;
  }
  return {
    heading: heading ?? humanize(stem),
    anchor: stem,
    content: lines.join("\n"),
  };
};

/* ---------------------------------------------------------------- lesson
 * The §5 markdown convention (lesson files only).
 */

export type LessonKind = NonNullable<Section["kind"]>;

/** `hint:` / `advice:` / `ref:` (case-insensitive) — the §5 prefixes.
 * `reference` is spelled `ref:` in markdown. */
const KIND_PREFIX_RE = /^(hint|advice|ref)\s*:\s*/i;

/** A depth ≥ 2 markdown heading ("## Hint: it's in the registry"). */
const HEADING_RE = /^(#{2,6})\s+(.*)$/;

/** A fenced code block opener/closer: ``` or ~~~ (any indent). Fences
 * are NEVER scanned for headings — a hint:-looking line inside a code
 * block stays code. */
const FENCE_RE = /^\s*(`{3,}|~{3,})/;

const kindOfPrefix = (match: string): LessonKind => {
  const lower = match.toLowerCase();
  if (lower === "hint") return "hint";
  if (lower === "advice") return "advice";
  return "reference";
};

/** "Hint: it's in the registry" → "it's in the registry" (display). */
export const stripKindPrefix = (heading: string): string =>
  heading.replace(KIND_PREFIX_RE, "");

/** "it's in the registry" → "its-in-the-registry": the hint window's
 * anchor (the id a trigger link's fragment names). Deterministic. */
export const lessonAnchor = (heading: string): string =>
  heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

type HeadingMatch = {
  depth: number;
  kind: LessonKind | undefined;
  text: string;
};

/** One scanned line → its heading (with the §5 kind, if any), or
 * undefined (prose/fence). */
const headingOf = (line: string): HeadingMatch | undefined => {
  const match = HEADING_RE.exec(line);
  if (!match) return undefined;
  const text = match[2]!.trim();
  const prefix = KIND_PREFIX_RE.exec(text);
  return {
    depth: match[1]!.length,
    kind: prefix ? kindOfPrefix(prefix[1]!) : undefined,
    text,
  };
};

/**
 * Parse a lesson body into Sections (docs/LEARNING_PLAN.md §5): prose
 * stays prose; every depth ≥ 2 heading with a §5 prefix opens a nested
 * Section of that kind holding everything up to the next heading of the
 * same or shallower depth (other headings fold into their nearest hint
 * context the same way — plain headings inside a hint stay part of it,
 * without the kind). Fenced code blocks are skipped wholesale. The
 * prefix is stripped from the displayed heading; the anchor is the
 * kebab-cased remainder, so `[need a hint?](#its-slug)` is a real
 * fragment URL naming the hint window.
 */
export const lessonBlocks = (lines: string[], parentDepth: number): Item[] => {
  const items: Item[] = [];
  let prose: string[] = [];
  const flush = () => {
    if (prose.length > 0) {
      items.push(prose.join("\n").trimEnd());
      prose = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (FENCE_RE.test(line)) {
      // Whole fence, opener to closer (or end of lines), is prose.
      const fence = line.trim();
      prose.push(line);
      i++;
      while (i < lines.length && lines[i]!.trim() !== fence) {
        prose.push(lines[i]!);
        i++;
      }
      if (i < lines.length) prose.push(lines[i]!);
      continue;
    }
    const heading = headingOf(line);
    if (heading === undefined) {
      prose.push(line);
      continue;
    }
    if (heading.depth <= parentDepth) {
      // Same or shallower: this heading belongs to the CALLER.
      break;
    }
    if (heading.kind !== undefined) {
      flush();
      // Collect the hint's body: up to the next heading of the same
      // or shallower depth (fences skipped), then recurse so a deeper
      // hint: heading nests properly.
      const body: string[] = [];
      i++;
      while (i < lines.length) {
        const inner = lines[i] ?? "";
        if (FENCE_RE.test(inner)) {
          const fence = inner.trim();
          body.push(inner);
          i++;
          while (i < lines.length && lines[i]!.trim() !== fence) {
            body.push(lines[i]!);
            i++;
          }
          if (i < lines.length) body.push(lines[i]!);
          i++;
          continue;
        }
        const innerHeading = headingOf(inner);
        if (innerHeading !== undefined && innerHeading.depth <= heading.depth)
          break;
        body.push(inner);
        i++;
      }
      i--; // the caller re-reads the break-heading line
      const display = stripKindPrefix(heading.text);
      items.push({
        heading: display,
        kind: heading.kind,
        anchor: lessonAnchor(display),
        content: lessonBlocks(body, heading.depth),
      });
      continue;
    }
    // A plain heading: prose (the convention never lifts it).
    prose.push(line);
  }
  flush();
  return items;
};

/**
 * Wrap a LESSON markdown file as a root Section: the leading
 * `# Heading` names the window (same as mdSection), the §5 convention
 * builds nested hint/advice/reference windows, and the root opts into
 * the diagonal layout (§6).
 */
export const mdLessonSection = (stem: string, md: string): Section => {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  let heading: string | undefined;
  while (heading === undefined && lines.length > 0) {
    const line = lines[0] ?? "";
    if (line.trim() === "") lines.shift();
    else if (line.startsWith("# ")) {
      heading = line.slice(2).trim();
      lines.shift();
    } else break;
  }
  return {
    heading: heading ?? humanize(stem),
    anchor: stem,
    theme: "open",
    flow: "diagonal",
    content: lessonBlocks(lines, 1),
  };
};
