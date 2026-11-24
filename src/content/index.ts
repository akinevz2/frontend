import type { Project, Route, Section, SoundCloudData } from "./schema";
import pagesJson from "./pages.json";
import projectMtimes from "virtual:project-mtimes";
import contentTargets from "virtual:content-targets";
import projectRegistry from "./projects/_registry.json";
import {
  expandSection,
  makeResolver,
  setProjectRegistry,
  type IncludeEntry,
} from "@/renderer/index.ts";
import sectionsJson from "./sections.json";
import contactsJson from "./contacts.json";
import addonsJson from "./addons.json";
import configsJson from "./configs.json";
import blogJson from "./blog.json";
import soundcloudJson from "./soundcloud.json";
import musicExtJson from "./music-ext.json";

export * from "./schema";
export * from "./learningTree";

/* ------------------------------------------------------------------ includes
 * A content file can embed another content file's window tree with an
 * include directive instead of duplicating it:
 *
 *   { "include": "/characters.json" }  → the Section of
 *                                        public/characters.json
 *   { "include": "/blog/releases/get-traversal.md" }
 *            → the markdown file at that public path, wrapped as a Section
 *
 * Include targets live under public/ and directives carry the PUBLIC PATH
 * (leading slash, extension included) — the same address the file is served
 * at, so an include target doubles as a standalone page. Resolution is
 * reference-driven (build/contentTargetsPlugin.ts): the build scans the
 * content files' directive strings and inlines exactly the targets they
 * name — no directory list, no scan registry. A dangling path fails the
 * build.
 *
 *   - `.json`: must hold a Section (the window-tree shape of a content file).
 *   - `.md`: author-written markdown (literal newlines), imported raw and
 *     wrapped as `{ heading, anchor: <stem>, content: <md> }` (no theme:
 *     An optional leading `# Heading` line names the window; otherwise the
 *     humanized file stem does ("make-recipes" → "Make recipes").
 * Directives are expanded at load time, recursively (an included tree may
 * itself contain directives), through the SHARED resolver
 * (src/renderer/includes/resolve.ts) — the same implementation the
 * prerender uses. Unknown directives throw during module load, failing the
 * build loudly instead of rendering an opaque object. Each file may be
 * included multiple times across sibling items; cycles are broken by the
 * seen-set, which tracks one inclusion chain.
 *
 * Everything here precedes its first use: exports below expand their
 * trees at module evaluation, so this scaffolding must be initialized
 * by then (const declarations do not hoist).
 */

/** The discovered include targets (public path → raw text), as the build
 * inlined them. Exported for the snapshot drift guard
 * (test/renderer-snapshot.test.js): the prerender expands the SAME
 * targets through the SAME resolver. */
export const includeTargets: Record<string, IncludeEntry> = contentTargets;

const resolveTarget = makeResolver(contentTargets);

/** Expands every include directive in the tree rooted at `section`. */
const resolveIncludes = (section: Section): Section =>
  expandSection(section, resolveTarget);

const projectModules = import.meta.glob<Project>(
  ["./projects/*.json", "!./projects/_*.json"],
  { eager: true, import: "default" },
);

// The generated registry (scripts/refresh-projects.mjs) backs the
// {{registry:<slug>}} tokens the projects pages carry — installed
// BEFORE the project trees expand below, so both loaders (this module
// for the app, the snapshot prerender for the static pages) expand
// identically.
setProjectRegistry(projectRegistry.projects);

/** The projects-page grouping: the group ORDER is declarative (the
 *  most user-facing first — the operating system repos, then the system
 *  submodules they depend on, then the older web-based projects); the
 *  per-group ordering stays the lastModified sort. A project without a
 *  group fact lands in "web" (the oldest surface). */
export const GROUP_ORDER = ["core", "system", "web"] as const;
export const GROUP_LABELS: Record<string, string> = {
    core: "the operating system",
    system: "the system submodules",
    web: "the web-based projects",
};

export const projectPath = (project: Project) =>
  project.path ?? `/projects/${project.slug}`;

/**
 * Sort key for a project: [0] = 0 when the project has no `lastModified`
 * (undated — lists first), 1 when it does; [1] = the sort timestamp
 * (mtime for undated, epoch ms of the ISO date for dated). Undated
 * projects sort among themselves by mtime, newest first; dated ones by
 * their `lastModified` field.
 */
/**
 * Sort key for a project: [0] = 0 when the project has no `lastModified`
 * (undated — lists first), 1 when it does; [1] = the sort timestamp
 * (mtime for undated, epoch ms of the ISO date for dated). Undated
 * projects sort among themselves by file mtime (newest first); dated
 * ones by their `lastModified` field. The title breaks ties within
 * each group. Mtimes come from the virtual:project-mtimes module
 * (build/projectMtimesPlugin.ts) — the projects directory walk,
 * recomputed by the dev watcher; the map is keyed by the file name
 * (the glob key, so the lookup is exact even when a file name differs
 * from its slug).
 */
const keyOf = (project: Project, file: string): [number, number] =>
  project.lastModified
    ? [1, Date.parse(project.lastModified) || 0]
    : [0, projectMtimes[file] ?? 0];

export const projects = Object.entries(projectModules)
  // Project pages can embed shared content the same way page trees can:
  // expand include directives (e.g. the make-recipes table) at load time.
  .map(([file, project]) => ({
    file,
    project: {
      ...project,
      content: resolveIncludes(project.content),
    },
  }))
  // Undated projects list FIRST (they are the newest work), among
  // themselves by file mtime (newest first); the dated ones follow by
  // `lastModified` (most recently updated first). The title breaks
  // ties within each group.
  .sort((a, b) => {
    const aKey = keyOf(a.project, a.file);
    const bKey = keyOf(b.project, b.file);
    if (aKey[0] !== bKey[0]) return aKey[0] - bKey[0]; // undated first
    if (aKey[1] !== bKey[1]) return bKey[1] - aKey[1]; // newest first
    return a.project.title.localeCompare(b.project.title);
  })
  .map((entry) => entry.project);

/**
 * Short-hand URL for a project: /<slug>. Redirects to the canonical
 * /projects/<slug> route via the same alias mechanism pages.json uses.
 */
export const projectShortPath = (project: Project) => `/${project.slug}`;

function projectRoute(project: Project): Route {
  return {
    path: projectPath(project),
    title: project.title,
    description: project.description,
    page: "ProjectPage",
    menu: false,
  };
}

/** Alias route: hidden, redirects to the canonical project route. */
function projectAliasRoute(project: Project): Route {
  return {
    path: projectShortPath(project),
    title: project.title,
    description: project.description,
    page: "ProjectPage",
    alias: projectPath(project),
    menu: false,
    hidden: true,
  };
}

/** Static pages from pages.json, kept separate so project aliases can check clashes. */
const pageRoutes: Route[] = pagesJson as Route[];

/**
 * One canonical route per project (/projects/<slug>) plus a hidden
 * short-hand alias route (/<slug>) redirecting to it. The alias is
 * skipped when the slug would clash with an existing route path.
 */
const projectRoutes: Route[] = projects.flatMap((project): Route[] => {
  const taken =
    pageRoutes.some((page) => page.path === projectShortPath(project)) ||
    projects.some(
      (other) =>
        other !== project && projectPath(other) === projectShortPath(project),
    );
  return taken
    ? [projectRoute(project)]
    : [projectRoute(project), projectAliasRoute(project)];
});

export const routes: Route[] = [...pageRoutes, ...projectRoutes];

export const sections = resolveIncludes(sectionsJson as Section);
export const contacts = resolveIncludes(contactsJson as Section);
export const addons = resolveIncludes(addonsJson as Section);
export const configs = resolveIncludes(configsJson as Section);
export const blog = resolveIncludes(blogJson as Section);
export const soundcloud = soundcloudJson as SoundCloudData;
export const musicExt = musicExtJson;
export * from "./blogDirs";
