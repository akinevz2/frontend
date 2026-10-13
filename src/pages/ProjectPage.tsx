import { useLocation, useNavigate } from "react-router-dom";
import { projectPath, projects, type Item, type Section } from "@/content";
import { normalizePath } from "@/shell/resolveRoute";
import { PageWindows } from "@/window";

const toItems = (content: Section["content"]): Item[] =>
  content === undefined ? [] : Array.isArray(content) ? content : [content];

export const ProjectPage = () => {
  const navigate = useNavigate();
  const path = normalizePath(useLocation().pathname);
  const project = projects.find((p) => projectPath(p) === path);
  if (!project) return null;
  const back = (
    <div className="back-row">
      <button onClick={() => navigate("/projects")}>Back</button>
    </div>
  );
  const content = {
    theme: "open" as const,
    ...project.content,
    content: [...toItems(project.content.content), back],
  };
  return <PageWindows content={content} />;
};
