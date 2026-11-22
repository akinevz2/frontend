import {
  learningLessonExists,
  learningLessonExtension,
  type Section,
  type ThemeName,
} from "@/content";
import {
  directivePaths,
  expandSection,
  makeResolver,
  mdLessonSection,
  stemOf,
  type IncludeEntry,
} from "@/renderer/index.ts";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { PageWindows } from "@/window";

/** A lesson page at /learning/<slug> (docs/LEARNING_PLAN.md §8 Phase 2).
 *
 * The source file (public/learning/<slug>.md or .json) is fetched at
 * runtime like a blog post, but rendered DIRECTLY as the page's window
 * tree — never through the ResourceEmbed scroll (§5: no iframe, trigger
 * links keep real hrefs). A .md lesson wraps through the §5 lesson
 * convention; a .json lesson is its authored Section with its include
 * directives expanded at runtime against the SAME resolver the
 * prerender uses (src/renderer/includes/resolve.ts) — targets fetched
 * (once each) from their public paths. A dangling include surfaces as
 * an error window; the build's prerender resolves every lesson, so one
 * can never ship (failures are loud at build time). */
export const LessonPage = () => {
  const { pathname } = useLocation();
  const ext = learningLessonExtension(decodeURI(pathname));
  const [section, setSection] = useState<Section | null>(null);

  useEffect(() => {
    if (!ext) return;
    let live = true;
    setSection(null);
    (async () => {
      try {
        const response = await fetch(`${pathname}${ext}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        if (ext === ".md") {
          const md = await response.text();
          return mdLessonSection(stemOf(`${pathname}.md`), md);
        }
        const text = await response.text();
        const parsed = JSON.parse(text) as Section;
        // Expand includes at runtime: discover the directives the raw
        // json names, fetch each target once, resolve through the
        // shared, pure resolver.
        const entries: Record<string, IncludeEntry> = {};
        const queue = [text];
        for (let i = 0; i < queue.length; i++) {
          for (const name of directivePaths(queue[i]!)) {
            if (entries[name]) continue;
            const target = await fetch(name);
            if (!target.ok)
              throw new Error(`HTTP ${target.status} for ${name}`);
            const kind: IncludeEntry["kind"] = name
              .toLowerCase()
              .endsWith(".json")
              ? "json"
              : "md";
            const content = await target.text();
            entries[name] = { kind, content };
            if (kind === "json") queue.push(content);
          }
        }
        return expandSection(parsed, makeResolver(entries));
      } catch (error) {
        // Degraded-but-honest: the lesson names its failure inline.
        const message = error instanceof Error ? error.message : String(error);
        return {
          heading: "lesson unavailable",
          content: `Failed to load the lesson at ${pathname}: ${message}`,
        } satisfies Section;
      }
    })().then((result) => {
      if (live) setSection(result);
    });
    return () => {
      live = false;
    };
  }, [ext, pathname]);

  if (!learningLessonExists(decodeURI(pathname))) return null;
  if (!section) return null;
  const themes = section.theme
    ? Array.isArray(section.theme)
      ? section.theme
      : [section.theme]
    : [];
  // The root window must read open (children mount) — the same
  // treatment a .json blog post gets (BlogPostPage).
  const lesson: Section = themes.includes("open")
    ? section
    : { ...section, theme: [...themes, "open"] as ThemeName[] };
  return (
    <div {...(lesson.flow === "diagonal" ? { "data-flow": "diagonal" } : {})}>
      <PageWindows content={lesson} />
    </div>
  );
};
