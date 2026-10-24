import { useLocation } from "react-router-dom";
import { projectPath, projects, type Item, type Section } from "@/content";
import { normalizePath } from "@/shell/resolveRoute";
import { useSignals } from "@/lib/signals";
import { PageWindows } from "@/window";

const toItems = (content: Section["content"]): Item[] =>
  content === undefined ? [] : Array.isArray(content) ? content : [content];

export const ProjectPage = () => {
  // Leaving the page is a command, not a router call — the shell owns
  // the single router-aware "app:navigate" handler.
  const { dispatch } = useSignals();
  const path = normalizePath(useLocation().pathname);
  const project = projects.find((p) => projectPath(p) === path);
  if (!project) return null;
  const content = {
    theme: "open" as const,
    ...project.content,
    content: toItems(project.content.content),
  };
  return (
    <PageWindows
      content={content}
      onLeave={() => dispatch("app:navigate", { to: "/projects" })}
    />
  );
};
