import { PurePage } from "../components/PurePage";

const NotFoundPage = () => {
  // Placeholder implementation - in real app this would show 404 content
  const mockSections = {
    heading: "Page Not Found",
    content: "The page you are looking for does not exist.",
  };

  return <PurePage content={mockSections} />;
};

export default NotFoundPage;
