import { BasePage } from "./BasePage";

export const BlogPage = () => {
  // Placeholder implementation - in real app this would load blog content
  const mockSections = {
    title: "Blog",
    content: "This is the blog page content",
  };

  return <BasePage content={mockSections} />;
};
