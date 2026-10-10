import type { PageComponent } from "..";
import { PurePage } from "../components/PurePage";
import blog from "@/content/blog.json";

export const AddonsPage: PageComponent = ({ current }) => {
  // Process the sections content for rendering - in a real app this would be more complex
  const { title } = current;
  return (
    <PurePage
      json={{
        heading: title,
        content: blog,
      }}
    />
  );
};
