/**
 * BasePage - Core infrastructure component for declarative page rendering
 * Phase 1: Core Infrastructure Implementation
 * 
 * This component provides the foundational structure for all page implementations.
 * It uses a declarative approach where all content comes from JSON structures,
 * no hardcoded HTML, and clean composition patterns.
 */

import { useMemo } from "react";
import { Section } from "../components/Section";
import { MenuBarWithContext } from "../components/MenuBarWithContext";
import { SectionProvider } from "../windows/providers";
import type { SectionProps } from "../windows/types.d.ts";
import { usePageMetaProvider } from "../config/pageMetaProvider";
import type { PageInfo } from "../hooks/usePages.ts";
import { processContent } from "../windows/utils.ts";

// PageMeta interface for generating meta tags
export interface PageMeta {
  title: string;
  description: string;
}

export interface BasePageProps {
  pageConfig: PageInfo;
  // Core content - must come from JSON
  content: SectionProps;
  // Optional: generate meta tags dynamically
  meta: PageMetaProvider;
}

export function BasePage({ content, meta, pageConfig }: Readonly<BasePageProps>) {
  const { processed, metadata } = useMemo(
    () => processContent(content),
    [content]
  );

  // Generate meta tags from staticTitle or meta object
  const metaValue = useMemo(() => {
    if (pageConfig) {
      return pageConfig;
    }
    throw Error("not yet implemented");
  }, [pageConfig]);



  return (
    <SectionProvider pageMetadata={{ sections: metadata }}>
      <main className="page-container">
        <MenuBarWithContext />
        <section className="page-content">
          {Array.isArray(processed) ? (
            processed.map((item, index) => (
              <Section key={item.uuid || index} {...item} />
            ))
          ) : (
            <Section {...processed} />
          )}
        </section>
      </main>
    </SectionProvider>
  );
}
