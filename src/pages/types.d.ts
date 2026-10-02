/**
 * Page Type Definitions
 * Complete Page type system with unified Page interface
 * Phase 1: Complete Type Definitions in src/pages/types.d.ts
 */

import type { SectionContent } from "../types";

// --- Page Type System (Single unified Page type) ---
export type PageType =
  | "home"
  | "resume"
  | "addons"
  | "blog"
  | "contact"
  | "wow"
  | "pagerts"
  | "sitemap"
  | "music"
  | "notfound"
  | "admin";
export type PageContentStructure = SectionContent;

// PageMeta interface for generating meta tags
export interface PageMeta {
  title: string;
  description: string;
  keywords?: string[];
}

/**
 * Page - Core interface for all page implementations.
 * Defines the structure all pages share in the new declarative system.
 */
export interface Page {
  type: PageType;
  path: string;
  title: string;
  description: string;
  staticTitle?: string;
  meta?: PageMeta;
  content: PageContentStructure;
}

/**
 * BasePageProps - Properties for BasePage component.
 * Contains the content and optional metadata for page rendering.
 */
export interface BasePageProps {
  content: PageContentStructure;
  staticTitle?: string;
  meta?: PageMeta;
}

/**
 * PageProps - Properties for Page component (legacy compatibility).
 * No pageMetadata prop - removed in Phase 7
 */
export interface PageProps {
  content: PageContentStructure;
  staticTitle?: string;
  meta?: PageMeta;
  // No pageMetadata prop - removed in Phase 7
  footer?: React.ReactNode;
}

// Export legacy PageProps type compatibility
export type AllPageProps = BasePageProps | PageProps;
