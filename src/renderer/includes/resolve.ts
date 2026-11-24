/** The shared include resolver — ONE expansion implementation for the
 * app and the prerender (docs/LEARNING_PLAN.md §4; both former copies —
 * src/content/index.ts's and src/seo/prerender.tsx's — are deleted).
 *
 * Pure: every disk/network touch is parameterised by the caller. The
 * app resolves against the build-inlined `virtual:content-targets` map
 * (reference-driven: the map holds exactly the targets the content's
 * directives name — no directory list, no scan); the prerender resolves
 * against a map its collect step built the same way from the served
 * trees.
 */

import type { Section } from "@/content/schema";
import { mdSection, stemOf } from "./mdSection.ts";
import { validateIncludePath } from "./paths.ts";

/* ---------------------------------------------------------- registry
 * The project-registry tokens (docs/DEPOT.md-adjacent; the mechanical
 * sync between the projects pages and the implementations): a content
 * string may carry {{registry:<slug>}}, expanded to that project's
 * version from the GENERATED registry (src/content/projects/
 * _registry.json — scripts/refresh-projects.mjs). The registry is set
 * by the loaders (src/content for the app, the snapshot prerender for
 * the static pages) — both import THIS module, so the app and the
 * static pages can never expand differently. A token naming a slug
 * the registry does not know stays VISIBLE — loud, never silently
 * blank. Prose never carries numbers the registry owns.
 */

export type RegistryEntry = { version?: string | null };
let registry: Record<string, RegistryEntry> = {};

/** Installs the generated registry (both loaders call this at init). */
export function setProjectRegistry(
  map: Record<string, RegistryEntry> | undefined,
): void {
  registry = map ?? {};
}

const REGISTRY_TOKEN = /\{\{registry:([a-z0-9-]+)\}\}/g;

/** Expands {{registry:<slug>}} tokens in one string; unknown slugs
 * keep their token (loud). */
export function expandRegistryTokens(text: string): string {
  return text.replace(REGISTRY_TOKEN, (token, slug: string) => {
    const version = registry[slug]?.version;
    return typeof version === "string" && version !== "" ? version : token;
  });
}

/** A discovered include target: its kind and raw text. */
export type IncludeEntry = { kind: "json" | "md"; content: string };

/** Directive shape: `{"include": "<public path>"}` in a content JSON. */
const DIRECTIVE_RE = /"include"\s*:\s*"([^"]+)"/g;

/** The validated include paths one text carries (directives live in
 * content JSON only; `.md` targets are leaves — the markdown wrapper
 * never scans them). */
export function directivePaths(text: string): string[] {
  const out: string[] = [];
  for (const match of text.matchAll(DIRECTIVE_RE)) {
    out.push(validateIncludePath(match[1] ?? ""));
  }
  return out;
}

/** A include target's text → its Section (`.json` holds a Section;
 * `.md` is author-written markdown wrapped by mdSection). */
export function parseTarget(publicPath: string, entry: IncludeEntry): Section {
  if (entry.kind === "json") {
    return JSON.parse(entry.content) as Section;
  }
  return mdSection(stemOf(publicPath), entry.content);
}

/**
 * Reference-driven discovery: starting from the ROOT texts (the content
 * files themselves — never a directory walk), collect every include
 * target the directives name, transitively (a discovered `.json` target
 * is scanned for further directives). `read` throws on an unreadable
 * path; the error names the including file and the path, failing the
 * build loudly — the prerender resolves every route, so a dangling
 * include can never ship.
 */
export function discoverTargets(
  read: (path: string) => IncludeEntry,
  roots: Array<{ path: string; text: string }>,
): Record<string, IncludeEntry> {
  const entries: Record<string, IncludeEntry> = {};
  const queue: Array<{ path: string; text: string }> = [...roots];
  for (let i = 0; i < queue.length; i++) {
    const { path: origin, text } = queue[i]!;
    for (const name of directivePaths(text)) {
      if (entries[name]) continue;
      let entry: IncludeEntry;
      try {
        entry = read(name);
      } catch (cause) {
        throw new Error(
          `Unresolvable include directive: ${name} ` +
            `(from ${origin}): ${cause instanceof Error ? cause.message : String(cause)}`,
          { cause },
        );
      }
      entries[name] = entry;
      if (entry.kind === "json") {
        queue.push({ path: name, text: entry.content });
      }
    }
  }
  return entries;
}

/** The include target a directive path resolves to — the same checks and
 * messages src/content/index.ts's includeTarget performed, over a
 * reference-derived map instead of a scanned directory. */
export function targetFromMap(
  entries: Record<string, IncludeEntry>,
  name: string,
): Section {
  validateIncludePath(name);
  const entry = entries[name];
  if (!entry) {
    throw new Error(
      `Unknown include directive: ${name} ` +
        "(no content directive references a target at this path)",
    );
  }
  return parseTarget(name, entry);
}

/** A memoising resolver over a discovered target map — the `read` backend
 * for expandSection in the app and the prerender alike. */
export function makeResolver(
  entries: Record<string, IncludeEntry>,
): (name: string) => Section {
  const cache = new Map<string, Section>();
  return (name) => {
    const cached = cache.get(name);
    if (cached) return cached;
    const section = targetFromMap(entries, name);
    cache.set(name, section);
    return section;
  };
}

function expandContent(
  content: NonNullable<Section["content"]>,
  resolveTarget: (name: string) => Section,
  ancestors: Set<string>,
): NonNullable<Section["content"]> {
  if (typeof content === "string") return expandRegistryTokens(content);
  const items = Array.isArray(content) ? content : [content];
  return items.map((item) => {
    if (typeof item === "string") return expandRegistryTokens(item);
    if (typeof item !== "object" || item === null) return item;
    if ("include" in item) {
      const name = item.include;
      if (typeof name !== "string") {
        throw new Error(`Unknown include directive: ${String(name)}`);
      }
      if (ancestors.has(name)) {
        throw new Error(`Circular include directive: ${name}`);
      }
      const chain = new Set(ancestors);
      chain.add(name);
      return expandSection(resolveTarget(name), resolveTarget, chain);
    }
    if ("banner" in item || "url" in item) return item;
    return expandSection(item as Section, resolveTarget, ancestors);
  });
}

/** Expands a nested section, preserving the absence of content exactly.
 * The status line participates in the registry expansion too — it is
 * the page's own "stable in vX" number, registry-owned like the links
 * windows. */
export function expandSection(
  section: Section,
  resolveTarget: (name: string) => Section,
  ancestors: Set<string> = new Set(),
): Section {
  const next = section.content
    ? {
        ...section,
        content: expandContent(section.content, resolveTarget, ancestors),
      }
    : section;
  return typeof next.status === "string"
    ? { ...next, status: expandRegistryTokens(next.status) }
    : next;
}

/** Expands every include directive in the tree rooted at `section`. */
export function resolveSections(
  section: Section,
  entries: Record<string, IncludeEntry>,
): Section {
  return expandSection(section, makeResolver(entries));
}
