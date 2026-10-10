import { useCallback, useMemo, useState } from "react";
import { PageSpace } from "./PageSpace";
import type { Pages, Page } from "..";
import type { PageComponent } from "../types";
import { PageContext } from "./PageContext";
import { createPageRegistry } from "./PageRegistry";
import { SectionProvider } from "./SectionContext";

/**
 * Provider component that makes page data available throughout the app
 */
export function PageProvider({
  pages: given,
  children,
}: {
  pages: Pages;
  children: React.ReactNode;
}) {
  const [pages, setPages] = useState<Pages>([...given]);

  const registerPages = useCallback((additionalPages: readonly Page[]) => {
    setPages((currentPages) => {
      const existingPaths = new Set(currentPages.map((page) => page.path));
      const nextPages = additionalPages.filter(
        (page) => !existingPaths.has(page.path),
      );
      return nextPages.length === 0
        ? currentPages
        : [...currentPages, ...nextPages];
    });
  }, []);

  const PageRegistry = useMemo(() => {
    const mods = import.meta.glob("./implementations/*Page.tsx", {
      eager: true,
    }) as Record<string, Record<string, unknown>>;
    const staticRegistry = Object.values(mods).flatMap((mod) =>
      Object.entries(mod).filter(
        (entry): entry is [string, PageComponent] =>
          typeof entry[0] === "string" &&
          typeof entry[1] === "function" &&
          entry[0].endsWith("Page"),
      ),
    );
    return createPageRegistry({
      pages: Object.create(staticRegistry),
    });
  }, [given]);

  return (
    <PageContext.Provider value={{ pages, registerPages, PageRegistry }}>
      <SectionProvider>
        {children}
        <PageSpace />
      </SectionProvider>
    </PageContext.Provider>
  );
}
