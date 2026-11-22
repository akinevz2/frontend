import generated from "virtual:learning-tree";
import type { Section } from "./schema";
import { stripTrailingSlashes } from "@/lib/slashes";

/**
 * The learning tree (docs/LEARNING_PLAN.md §5): lessons are
 * `public/learning/<slug>.md|json` — AT THE ROOT of the tree; deeper
 * directories (public/learning/resources/…) are REUSABLE OBJECTS, only
 * ever reached through include directives, never lesson pages. Like the
 * blog's directory snapshot (src/content/blogDirs.ts), the walk is
 * GENERATED: virtual:learning-tree (build/blogDirsPlugin.ts) walks the
 * real filesystem at dev-server start / build time — no file list to
 * author or refresh.
 */
const directories = (
  generated as {
    directories: Array<{ path: string; files: string[]; dirs: string[] }>;
  }
).directories;

const ROOT = "/learning";

const rootEntry = () => directories.find((dir) => dir.path === ROOT);

const isLessonFile = (file: string): boolean => /\.md$|\.json$/i.test(file);

/** The lesson files at the learning ROOT, sorted case-insensitively
 * (the same ordering the walk produces). Resources live deeper — they
 * are include targets, never lessons. */
export function learningLessonFiles(): string[] {
  const files = rootEntry()?.files ?? [];
  return files.filter(isLessonFile);
}

/** Whether the extension-less address /learning/<slug> names a lesson:
 * <slug>.md or <slug>.json must exist at the root. Ancestor walk
 * entries (e.g. /learning/resources) never hold lessons. */
export function learningLessonExists(pathname: string): boolean {
  return learningLessonExtension(pathname) !== undefined;
}

/** The extension of the lesson file a /learning/<slug> address serves,
 * or undefined when no lesson lives there. */
export function learningLessonExtension(
  pathname: string,
): ".md" | ".json" | undefined {
  const path = stripTrailingSlashes(pathname).toLowerCase();
  if (!path.startsWith(`${ROOT}/`)) return undefined;
  const parent = path.replace(/\/[^/]*$/, "");
  if (parent !== ROOT) return undefined;
  const base = decodeURIComponent(path.split("/").pop() ?? "");
  const lower = base.toLowerCase();
  for (const file of learningLessonFiles()) {
    const stem = file.slice(0, file.lastIndexOf(".")).toLowerCase();
    if (stem === lower) {
      return file.toLowerCase().endsWith(".json") ? ".json" : ".md";
    }
  }
  return undefined;
}

/**
 * The /learning landing's window tree — a STUB (docs/LEARNING_PLAN.md §8
 * Phase 2: no lesson prose is authored yet; the route exists and links
 * the lessons with ordinary inline hyperlinks). Generated from the walk,
 * not authored: each lesson file links extension-less.
 */
export function learningLandingSection(): Section {
  const links = learningLessonFiles().map((file) => {
    const stem = file.slice(0, file.lastIndexOf("."));
    return `- [${stem}](/learning/${stem})`;
  });
  return {
    heading: "learning",
    theme: "open",
    className: "learning-landing-stub",
    content:
      links.length > 0
        ? links.join("\n")
        : "no lessons yet — the route is a stub",
  };
}
