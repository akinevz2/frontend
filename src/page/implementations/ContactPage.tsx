import { useMemo } from "react";
import { PurePage } from "../components/PurePage";
import sections from "../../content/contacts.json";
import type { PageComponent } from "..";

export const ContactPage: PageComponent = () => {
  // Process the sections content for rendering - in a real app this would be more complex
  const sectionMemo = useMemo(() => sections, [sections]);

  return <PurePage json={sectionMemo} />;
};
