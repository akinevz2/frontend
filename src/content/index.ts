import type { Project, Route, Section, SoundCloudData } from "./schema";
import pagesJson from "./pages.json";
import sectionsJson from "./sections.json";
import contactsJson from "./contacts.json";
import addonsJson from "./addons.json";
import configsJson from "./configs.json";
import charactersJson from "./includes/characters.json";
import blogJson from "./blog.json";
import soundcloudJson from "./soundcloud.json";
import musicExtJson from "./music-ext.json";

export * from "./schema";

/* ------------------------------------------------------------------ includes
 * A content file can embed another content file's window tree with an
 * include directive instead of duplicating it:
 *
 *   { "include": "make-recipes.md" } → the markdown file, wrapped as a Section
 *   { "include": "characters.json" }  →  the Section of includes/characters.json
 *
 * ANY file under src/content/includes/ is includable — no registration,
 * and the directive carries the FULL FILE NAME (extension included):
 *  - `.json`: must hold a Section (the window-tree shape of a content file).
 *  - `.md`: author-written markdown (literal newlines), imported raw and
 *    wrapped as `{ heading, anchor: <stem>, theme: "open", content: <md> }`.
 *    An optional leading `# Heading` line names the window; otherwise the
 *    humanized file stem does ("make-recipes" → "Make recipes").
 * Directives are expanded at load time, recursively (an included tree may
 * itself contain directives). Unknown or circular directives throw during
 * module load, failing the build loudly instead of rendering an opaque
 * object. Each file may be included multiple times across sibling items;
 * cycles are broken by the seen-set, which tracks one inclusion chain.
 * Target lookup goes through the vite glob maps — a directive never joins
 * paths itself, so a hostile name cannot escape the includes/ directory.
 *
 * Everything here precedes its first use: exports below expand their
 * trees at module evaluation, so this scaffolding must be initialized
 * by then (const declarations do not hoist).
 */

/** Every includable .json Section, keyed by file name ("characters.json"). */
const sectionModules = import.meta.glob<Section>("./includes/*.json", {
  eager: true,
  import: "default",
});

/** Every includable .md document, keyed by file name — imported raw. */
const mdModules = import.meta.glob<string>("./includes/*.md", {
  eager: true,
  import: "default",
  query: "?raw",
});

const stemOf = (path: string): string =>
  path
    .split("/")
    .pop()!
    .replace(/\.json$|\.md$/, "");

/** "make-recipes" → "Make recipes". */
const humanize = (stem: string): string =>
  stem.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());

/**
 * Wrap an include/ markdown file as a Section: `# Heading` first line
 * names the window (default: humanized stem); the rest is the content.
 */
const mdSection = (stem: string, md: string): Section => {
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
    content: lines.join("\n"),
  };
};

/** Includable Sections, keyed by FULL file name ("make-recipes.md"). */
const includes: Record<string, Section> = {
  ...sectionModules,
  ...Object.fromEntries(
    Object.entries(mdModules).map(([path, md]) => {
      const stem = stemOf(path);
      return [path.split("/").pop()!, mdSection(stem, md)];
    }),
  ),
};

/** The include target a directive file name resolves to. The name must
 * be a bare file name (no directories) with an includable extension;
 * unknown names throw — the same loud failure the renderer would
 * otherwise paper over. */
const includeTarget = (name: string): Section => {
  if (!/^[a-z0-9][a-z0-9._-]*\.(json|md)$/i.test(name) || name.includes("/")) {
    throw new Error(
      `Unknown include directive: ${name} ` +
        "(targets are bare .json/.md file names under src/content/includes/)",
    );
  }
  const target = includes[name];
  if (!target) {
    throw new Error(
      `Unknown include directive: ${name} (targets live in src/content/includes/)`,
    );
  }
  return target;
};

function expandContent(
  content: NonNullable<Section["content"]>,
  ancestors: Set<string>,
): NonNullable<Section["content"]> {
  if (typeof content === "string") return content;
  const items = Array.isArray(content) ? content : [content];
  return items.map((item) => {
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
      return expandSection(includeTarget(name), chain);
    }
    if ("banner" in item || "url" in item) return item;
    return expandSection(item as Section, ancestors);
  });
}

/** Expands a nested section, preserving the absence of content exactly. */
function expandSection(section: Section, ancestors: Set<string>): Section {
  if (!section.content) return section;
  return { ...section, content: expandContent(section.content, ancestors) };
}

/** Expands every include directive in the tree rooted at `section`. */
function resolveIncludes(section: Section): Section {
  if (!section.content) return section;
  return { ...section, content: expandContent(section.content, new Set()) };
}

const projectModules = import.meta.glob<Project>("./projects/*.json", {
  eager: true,
  import: "default",
});

export const projectPath = (project: Project) =>
  project.path ?? `/projects/${project.slug}`;

export const projects = Object.values(projectModules)
  // Project pages can embed shared content the same way page trees can:
  // expand include directives (e.g. the make-recipes table) at load time.
  .map((project): Project => ({
    ...project,
    content: resolveIncludes(project.content),
  }))
  .sort((a, b) => a.title.localeCompare(b.title));

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
export const characters = resolveIncludes(charactersJson as Section);
export const blog = resolveIncludes(blogJson as Section);
export const soundcloud = soundcloudJson as SoundCloudData;
export const musicExt = musicExtJson;
export * from "./blogDirs";
