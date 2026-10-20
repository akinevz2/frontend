import type { Project, Route, Section, SoundCloudData } from "./schema";
import pagesJson from "./pages.json";
import sectionsJson from "./sections.json";
import contactsJson from "./contacts.json";
import addonsJson from "./addons.json";
import configsJson from "./configs.json";
import charactersJson from "./characters.json";
import blogJson from "./blog.json";
import soundcloudJson from "./soundcloud.json";
import musicExtJson from "./music-ext.json";

export * from "./schema";

const projectModules = import.meta.glob<Project>("./projects/*.json", {
  eager: true,
  import: "default",
});

export const projectPath = (project: Project) =>
  project.path ?? `/projects/${project.slug}`;

export const projects = Object.values(projectModules).sort((a, b) =>
  a.title.localeCompare(b.title),
);

/** Static pages from pages.json plus one hidden-from-menu route per project. */
export const routes: Route[] = [
  ...(pagesJson as Route[]),
  ...projects.map((project): Route => ({
    path: projectPath(project),
    title: project.title,
    description: project.description,
    page: "ProjectPage",
    menu: false,
  })),
];
/* ------------------------------------------------------------------ includes
 * A content file can embed another content file's window tree with an
 * include directive instead of duplicating it:
 *
 *   { "include": "characters" }  →  the top-level Section of characters.json
 *
 * Directives are expanded at load time, recursively (an included tree may
 * itself contain directives). Unknown or circular directives throw during
 * module load, failing the build loudly instead of rendering an opaque
 * object. Each file may be included multiple times across sibling items;
 * cycles are broken by the seen-set, which tracks one inclusion chain.
 */
const includeRegistry: Record<string, Section> = {
  characters: charactersJson as Section,
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
      if (typeof name !== "string" || !includeRegistry[name]) {
        throw new Error(`Unknown include directive: ${String(name)}`);
      }
      if (ancestors.has(name)) {
        throw new Error(`Circular include directive: ${name}`);
      }
      const target = includeRegistry[name];
      const chain = new Set(ancestors);
      chain.add(name);
      return expandSection(target, chain);
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
const resolveIncludes = (section: Section): Section => {
  if (!section.content) return section;
  return { ...section, content: expandContent(section.content, new Set()) };
};

export const sections = resolveIncludes(sectionsJson as Section);
export const contacts = resolveIncludes(contactsJson as Section);
export const addons = resolveIncludes(addonsJson as Section);
export const configs = resolveIncludes(configsJson as Section);
export const characters = resolveIncludes(charactersJson as Section);
export const blog = resolveIncludes(blogJson as Section);
export const soundcloud = soundcloudJson as SoundCloudData;
export const musicExt = musicExtJson;
