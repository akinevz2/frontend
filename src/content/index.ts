import type { Project, Route, Section, SoundCloudData } from "./schema";
import pagesJson from "./pages.json";
import sectionsJson from "./sections.json";
import contactsJson from "./contacts.json";
import addonsJson from "./addons.json";
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
export const sections = sectionsJson as Section;
export const contacts = contactsJson as Section;
export const addons = addonsJson as Section;
export const characters = charactersJson as Section;
export const blog = blogJson as Section;
export const soundcloud = soundcloudJson as SoundCloudData;
export const musicExt = musicExtJson;
