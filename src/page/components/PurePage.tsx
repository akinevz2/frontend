/**
 * BasePage - Core Page Component for the New Refactored System
 *
 * This file contains:
 * 1. Basic infrastructure for page rendering
 * 2. Page methods and utilities required by the new system
 * 3. Integration with the new declarative page structure
 */

import { Window } from "./window/Window.tsx";
import type React from "react";
import { useContent } from "./hooks.ts";
import type { Content } from "@/content/types.d.ts";
import type { Location } from "react-router-dom";

export type PageSpaceProps = {
  location: Location;
};

export const PageSpace: React.FC<PageSpaceProps> = (props: PageSpaceProps) => {
  const { location } = props;


  const metadata = useContent(content);
  return <Window content={metadata} />
}


/**
 * BasePage - Main component that renders page content
 *
 * This is a pure component that uses the new declarative approach
 * for rendering pages based on configuration rather than hard-coded HTML
 */
export function PurePage<T extends unknown>({ content }: { content: Content<T> }) {
  return (
    <PageSpace content={content} />
  );
}



