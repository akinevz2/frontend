import { projectPath, projects, type Section } from "@/content";
import { PageWindows } from "@/window";

const projectWindow = (project: (typeof projects)[number]): Section => ({
  heading: project.title,
  theme: "open",
  content: [
    project.description,
    `[Project page](${projectPath(project)}) · [GitHub](${project.github})`,
  ],
});

export const ProjectsPage = () => (
  <PageWindows
    content={{
      heading: "Projects",
      theme: "open",
      content: projects.map(projectWindow),
    }}
  />
);
