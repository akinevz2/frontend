/** THE mdSection — the single copy of the markdown-file → Section
 * wrapper (the mirror that lived in src/seo/prerender.tsx is deleted;
 * everything imports this one). `docs/LEARNING_PLAN.md` §3.
 *
 * Phase 2 will extend this module with the hint:/advice:/ref: nesting
 * convention; the base wrapper stays exactly as it was. */

import type { Section } from "@/content/schema";

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
