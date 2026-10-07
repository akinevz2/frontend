import { useMemo } from "react";
import { PurePage } from "../components/PurePage";
import sections from "../../content/contacts.json";
import type { TextContent } from "@/content/types";

export const ContactPage = () => {
  // Process the sections content for rendering - in a real app this would be more complex
  const processed: TextContent<{}> = useMemo(() => sections, [sections]);

  return <PurePage content={processed} />;
};