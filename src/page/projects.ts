import type { PageConfig } from "./types";

interface ProjectRecord {
  name: string;
  description?: string;
  content?: string;
  category?: string;
  date?: string;
  [key: string]: unknown;
}

const projectModules = import.meta.glob("../content/projects/*.json", {
  eager: true,
  import: "default",
}) as Record<string, ProjectRecord>;

export const projectPages: PageConfig[] = Object.entries(projectModules).map(
  ([modulePath, project]) => {
    const projectId = modulePath
      .split("/")
      .at(-1)
      ?.replace(/\.json$/, "");

    if (!projectId) {
      throw new Error(`invalid project content path: ${modulePath}`);
    }

    return {
      path: `/projects/${projectId}`,
      page: "ProjectsPage",
      title: project.name,
      description: project.description ?? `Project ${projectId}`,
      menuLabel: null,
    };
  },
);

export function getProjectByPath(path: string): ProjectRecord | undefined {
  const projectId = path.match(/^\/projects\/([^/]+)$/)?.[1];
  return projectId
    ? projectModules[`../content/projects/${projectId}.json`]
    : undefined;
}

export function getProject(projectId: string): ProjectRecord | undefined {
  return projectModules[`../content/projects/${projectId}.json`];
}
