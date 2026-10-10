import { useEffect } from "react";
import { getProjectByPath, projectPages } from "../projects";
import { PurePage } from "../components/PurePage";
import { usePageContext, type PageComponent } from "..";

export const ProjectsPage: PageComponent = ({ current }) => {
  const { registerPages } = usePageContext();

  useEffect(() => {
    registerPages(projectPages);
  }, [registerPages]);

  const project = getProjectByPath(current.path);
  if (project) {
    return (
      <PurePage
        json={{
          heading: project.name,
          content: [
            project.description ?? project.name,
            project.content,
          ].filter((value): value is string => typeof value === "string"),
        }}
      />
    );
  }

  const projectSections = projectPages.map((project) => ({
    heading: project.title,
    content: project.description,
  }));

  return (
    <PurePage
      json={{
        heading: "Projects",
        content: projectSections,
      }}
    />
  );
};
