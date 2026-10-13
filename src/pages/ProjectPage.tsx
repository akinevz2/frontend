import { useLocation } from "react-router-dom";
import { projectPath, projects } from "@/content";
import { normalizePath } from "@/shell/resolveRoute";
import { PageWindows } from "@/window";

export const ProjectPage = () => {
  const path = normalizePath(useLocation().pathname);
  const project = projects.find((p) => projectPath(p) === path);
  return project ? <PageWindows content={project.content} /> : null;
};
