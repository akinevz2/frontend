/**
 * BlogPage - Blog page implementation using declarative architecture
 * Phase 2: Simplified usePages hook implementation
 * 
 * This component uses BasePage for content rendering, with JSON-based content structure.
 */

import { BasePage } from "./BasePage";
import type { SectionProps } from "../windows/types.d.ts";
import blogContentJson from "./structure/blog-sections.json";

/**
 * BlogPage - Blog page component
 * Uses JSON-based content structure for easy maintenance
 */
const BlogPage = () => {
  return (
    <BasePage
      content={blogContentJson as SectionProps}
      staticTitle="blog of kine"
    />
  );
};

export default BlogPage;
