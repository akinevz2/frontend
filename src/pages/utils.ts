/**
 * Page content structure utilities
 * Provides helper functions for content management
 */

/**
 * Type for page content sections
 */
export type SectionSection = {
  title: string;
  slug?: string;
  description?: string;
  content?: string;
  sections?: SectionSection[];
};

/**
 * Type for page JSON content structure
 */
export type ContentType = {
  [key: string]: SectionSection | string | number | boolean;
};

/**
 * Default page configuration
 */
export const DEFAULT_PAGE_CONFIG = {
  title: 'My Website',
  description: 'Personal website using React',
  keywords: 'react, website, personal',
  author: 'Your Name',
  image: '/default-image.jpg',
} as const;
