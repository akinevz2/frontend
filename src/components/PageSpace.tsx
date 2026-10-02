// PageSpace Component - Main Layout Wrapper
// This component provides the scrollable container for page content
// It integrates PageProvider, BasePage, and the Page rendering pipeline

import "xp.css/dist/98.css";
import "./PageSpace.css";
import { PageProvider } from "../pages/PageContext";
import { SectionProvider } from "../pages/SectionProvider";
import { BasePage } from "../pages/BasePage";
import { MenuBarWithContext } from "./MenuBarWithContext";
import type { ReactNode } from "react";
import type { PageMetadata } from "../types";

interface PageSpaceProps {
  children?: ReactNode;
  page?: string;
  metadata?: PageMetadata;
  className?: string;
}

export function PageSpace({
  children,
  metadata,
  className = "page-content-container",
}: Readonly<PageSpaceProps>) {
  return (
    <PageProvider>
      <main className="page-container">
        <MenuBarWithContext />
        <section className={className}>
          <SectionProvider>
            {children || <BasePage />}
          </SectionProvider>
        </section>
      </main>
    </PageProvider>
  );
}
