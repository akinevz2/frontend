// PageSpace Component - Layout Wrapper for Content
// This component provides the scrollable container for page content
// It wraps page components that render inside it
// Constructed from Content-typed objects and structured content

import "xp.css/dist/98.css";
import "./PageSpace.css";
import type {
  Content,
  SectionProps,
  PageMetadata,
} from "../windows/types.d.ts";
import { processContent } from "../windows/utils.ts";
import { SectionProvider } from "../windows/providers.tsx";
import type { ReactNode } from "react";

interface PageSpaceProps {
  content: SectionProps;
  metadata?: PageMetadata;
  className?: string;
}

export function PageSpace({
  content,
  metadata,
  className = "PageSpace",
}: Readonly<PageSpaceProps>) {
  // Process content into structured Content objects
  const { processed } = processContent(content);

  const pageMetadata: PageMetadata = metadata || { sections: [] };

  return (
    <SectionProvider pageMetadata={pageMetadata.sections}>
      <div className={className}>
        {Array.isArray(processed) ? (
          processed.map((item, index) => {
            if (
              item &&
              typeof item === "object" &&
              ("heading" in item || "content" in item || "printout" in item)
            ) {
              return (
                <Section
                  key={`page-section-${index}`}
                  content={item as unknown as string}
                />
              );
            }
            return <span key={`page-text-${index}`}>{item as string}</span>;
          })
        ) : processed &&
          typeof processed === "object" &&
          ("heading" in processed || "content" in processed) ? (
          <Section content={processed as unknown as string} />
        ) : (
          <>{processed as ReactNode}</>
        )}
      </div>
    </SectionProvider>
  );
}

// Export helper for legacy compatibility
export function createPageStructure(structuredContent: Content): ReactNode {
  return <PageSpace content={structuredContent} />;
}
