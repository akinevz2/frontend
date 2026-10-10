import type { PageComponent } from "..";
import { PurePage } from "../components/PurePage";

export const ResumePage: PageComponent = () => {
  // Placeholder implementation - in real app this would load resume content
  const mockSections = {
    title: "Resume",
    content: "This is the resume page content",
  };

  return <PurePage json={mockSections} />;
};
