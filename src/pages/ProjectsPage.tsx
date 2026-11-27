import {
  projectPath,
  projects,
  GROUP_ORDER,
  GROUP_LABELS,
  type Section,
} from "@/content";
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
 * snapshot (src/renderer/snapshot) — the same data the component renders.
 * The page is GROUPED, flat (no nesting): one section per group, in the
 * declared GROUP_ORDER; the lastModified sort holds within each group. */
export const buildProjects = (): Section => {
  const byGroup = new Map<string, typeof projects>();
  for (const p of projects) {
    const g = p.group ?? "web";
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g)!.push(p);
  }
  const content: Section[] = [];
  for (const g of GROUP_ORDER) {
    const group = byGroup.get(g);
    if (!group || group.length === 0) continue;
    content.push({
      heading: (GROUP_LABELS[g] ?? g).toUpperCase(),
      theme: "open",
      content: group.map(projectWindow),
    });
  }
  return { heading: "Projects", theme: "open", content };
};

export const ProjectsPage = () => <PageWindows content={buildProjects()} />;
