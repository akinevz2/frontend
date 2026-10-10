/**
 * BasePage - Core Page Component for the New Refactored System
 *
 * This file contains:
 * 1. Basic infrastructure for page rendering
 * 2. Page methods and utilities required by the new system
 * 3. Integration with the new declarative page structure
 */

import type { SectionContent } from "@/content/types";
import { Window } from "./window/Window";
import { useContent } from "./hooks";
/**
 * BasePage - Main component that renders page content
 *
 * This is a pure component that uses the new declarative approach
 * for rendering pages based on configuration rather than hard-coded HTML
 */
export function PurePage({ json }: { json: SectionContent }) {
  if (!json) return null;
  const content = useContent(json);
  return <Window content={content} />;
}
