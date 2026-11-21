import { projectPath, projects, type Section } from "@/content";
import { PageWindows } from "@/window";

const projectWindow = (project: (typeof projects)[number]): Section => ({
  heading: project.title,
  theme: "open",
  link: projectPath(project),
  content: [
    project.description,
    `[Project page](${projectPath(project)}) · [GitHub](${project.github})`,
  ],
});

/** The page's content tree builder, exported for the build-time SEO
 * snapshot (src/renderer/snapshot) — the same data the component renders. */
export const buildProjects = (): Section => ({
  heading: "Projects",
  theme: "open",
  content: projects.map(projectWindow),
});

export const ProjectsPage = () => <PageWindows content={buildProjects()} />;
