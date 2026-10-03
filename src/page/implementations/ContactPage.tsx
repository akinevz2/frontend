import { useMemo } from "react";
import { BasePage } from "./BasePage";
import sections from "../content/contacts.json";

export const ContactPage = () => {
  // Process the sections content for rendering - in a real app this would be more complex
  const processed = useMemo(() => sections, [sections]);

  return <BasePage content={processed} />;
};