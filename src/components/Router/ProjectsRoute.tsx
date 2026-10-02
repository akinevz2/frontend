import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import NotFoundPage from "../../pages/NotFoundPage";

interface Project {
  name: string;
  description: string;
  content: string;
  images?: string[];
  category?: string;
  date?: string;
}

export function ProjectsRoute() {
  const { projectName } = useParams<{ projectName: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProject = async () => {
      if (!projectName) {
        navigate("/home", { replace: true });
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`/src/pages/projects/${projectName}.json`);
        if (!response.ok) {
          setProject(null);
          return;
        }

        const data = await response.json();
        setProject(data);
      } catch (error) {
        console.error("Failed to load project:", error);
        setProject(null);
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [projectName, navigate]);

  if (loading) {
    return <NotFoundPage state="loading" message="Loading project..." />;
  }

  if (!project) {
    return <NotFoundPage state="notfound" message="Project not found" />;
  }

  return (
    <div className="project-route">
      <header className="project-header">
        <h1 className="project-title">{project.name}</h1>
        {project.category && (
          <span className="project-category">{project.category}</span>
        )}
        {project.date && <time className="project-date">{project.date}</time>}
      </header>

      {project.description && (
        <section className="project-description">
          <p>{project.description}</p>
        </section>
      )}

      {project.images && project.images.length > 0 && (
        <section className="project-images">
          {project.images.map((image, index) => (
            <img
              key={index}
              src={image}
              alt={`${project.name} image ${index + 1}`}
            />
          ))}
        </section>
      )}

      <section className="project-content">
        <div dangerouslySetInnerHTML={{ __html: project.content }} />
      </section>
    </div>
  );
}

export default ProjectsRoute;
