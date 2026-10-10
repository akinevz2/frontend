import { useLocation } from "react-router-dom";
import { NotFoundPage } from "../implementations/NotFoundPage";
import { type PageComponent, type PageModule, type PageType } from "../index";
import { useMemo, type ReactNode } from "react";
import { usePage, usePageConfig } from "../hooks";
import { ErrorBoundary, ErrorProvider } from "../implementations/error";

export type PageSpaceProps = {
  children: ReactNode | undefined;
};

const mods = import.meta.glob("../implementations/*Page.tsx", {
  eager: true,
}) as Record<string, PageModule>;

const isPageType = (key: string): key is PageType => {
  const values: PageType[] = [
    "HomePage",
    "ContactPage",
    "AddonsPage",
    "CharactersPage",
    "ProjectsPage",
    "MusicPage",
    "BlogPage",
    "ResumePage",
    "NotFoundPage",
    "RandomPostsPage",
  ];
  return values.includes(key as PageType);
};

export const usePageRegistry = (page?: PageType) => {
  const memod = useMemo(() => {
    const PageRegistry = Object.fromEntries(
      Object.values(mods).flatMap((mod) =>
        Object.entries(mod).filter(
          (entry): entry is [PageType, PageComponent] =>
            typeof entry[0] === "string" &&
            typeof entry[1] === "function" &&
            isPageType(entry[0]),
        ),
      ),
    ) as Record<PageType, PageComponent>;
    return PageRegistry;
  }, [page]);

  return (page ? memod[page] : undefined) ?? NotFoundPage;
};

export function PageSpace() {
  const page = usePage();
  const location = useLocation();
  const current = usePageConfig(location.pathname);
  const PageComponent = usePageRegistry(page);
  return (
    <ErrorProvider key={location.key}>
      <ErrorBoundary>
        <PageComponent current={current} />
      </ErrorBoundary>
    </ErrorProvider>
  );
}
