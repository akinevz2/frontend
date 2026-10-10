import type { PageComponent } from "..";
import { PurePage } from "../components/PurePage";

export const BlogPage: PageComponent = () => {
  // Placeholder implementation - in real app this would load blog content
  const mockSections = {
    title: "Blog",
    content: "This is the blog page content",
  };

  return <PurePage json={mockSections} />;
};
