import { PurePage } from "../components/PurePage";

export const BlogPage = () => {
  // Placeholder implementation - in real app this would load blog content
  const mockSections = {
    title: "Blog",
    content: "This is the blog page content",
  };

  return <PurePage content={mockSections} />;
};
