import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { usePageContext } from "./components/PageContext";
import { page404, type PageConfig } from "./index";
import { resolvePage } from "./routing";

export const usePage = () => {
  const location = useLocation();
  const { pages } = usePageContext();
  return useMemo(() => {
    return resolvePage(pages, location.pathname, page404)?.page;
  }, [location.pathname, pages]);
};

export function usePageConfig(pathname: string): PageConfig {
  const { pages } = usePageContext();
  return resolvePage(pages, pathname, page404) ?? page404;
}
