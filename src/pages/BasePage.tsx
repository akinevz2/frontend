/**
 * BasePage - Core Page Component for the New Refactored System
 *
 * This file contains:
 * 1. Basic infrastructure for page rendering
 * 2. Page methods and utilities required by the new system
 * 3. Integration with the new declarative page structure
 */

import type { BasePageProps } from "./types";

/**
 * BasePage - Main component that renders page content
 * 
 * This is a pure component that uses the new declarative approach
 * for rendering pages based on configuration rather than hard-coded HTML
 */
export function BasePage({ content }: BasePageProps) {
  // If content is empty or null, return a basic placeholder
  if (!content) {
    return (
      <div className="base-page">
        <h1>Page not found</h1>
        <p>No content available for this page.</p>
      </div>
    );
  }

  // Render the actual page content based on the new structure
  return (
    <div className="base-page">
      {content}
    </div>
  );
}

/**
 * Page methods and utilities that can be called from other parts of the system
 */
export const PageMethods = {
  /**
   * Get page metadata for SEO and browser display
   */
  getMetadata: (pageType: string) => {
    // This would fetch metadata from a registry or config
    return {
      title: `${pageType.charAt(0).toUpperCase() + pageType.slice(1)} Page`,
      description: `This is the ${pageType} page of my website`,
    };
  },

  /**
   * Validate page configuration before rendering
   */
  validate: (content: any) => {
    return content !== null && content !== undefined;
  },

  /**
   * Prepare page for rendering with default values
   */
  prepare: (config: any) => {
    // Apply defaults or transformations to page config
    return {
      ...config,
      title: config.title || "Untitled",
      description: config.description || "",
    };
  },
};