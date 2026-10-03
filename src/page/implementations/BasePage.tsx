/**
 * BasePage - Core Page Component for the New Refactored System
 *
 * This file contains:
 * 1. Basic infrastructure for page rendering
 * 2. Page methods and utilities required by the new system
 * 3. Integration with the new declarative page structure
 */

import { Window } from "../components/window/Window.tsx";
import type { Content } from "../types";

/**
 * BasePage - Main component that renders page content
 *
 * This is a pure component that uses the new declarative approach
 * for rendering pages based on configuration rather than hard-coded HTML
 */
export const BasePage = ({ content }: { content: Content<{}> }) => {
  return (
    <Window content={content} depth={0} treeIndex="0" />
  );
}
