/**
 * Custom hook for managing website page routing state.
 * Provides centralized page navigation and current page tracking.
 */

import { useCallback, useEffect, useReducer } from "react";
import pages from "../pages.json"

export type PageInfo = {
  id: string;
  Component: React.ComponentType<Record<string, unknown>>;
  name: string;
  path: string;
};

const INITIAL_REGISTRY: PageInfo[] = [
  {
    id: "home",
    name: "HomePage",
    path: "/",
    Component: null as unknown as React.ComponentType<Record<string, unknown>>,
  },
  {
    id: "addons",
    name: "AddonsPage",
    path: "/addons",
    Component: null as unknown as React.ComponentType<Record<string, unknown>>,
  },
  {
    id: "contact",
    name: "ContactPage",
    path: "/contact",
    Component: null as unknown as React.ComponentType<Record<string, unknown>>,
  },
  {
    id: "resume",
    name: "ResumePage",
    path: "/resume",
    Component: null as unknown as React.ComponentType<Record<string, unknown>>,
  },
  {
    id: "wow",
    name: "WowPage",
    path: "/wow",
    Component: null as unknown as React.ComponentType<Record<string, unknown>>,
  },
  {
    id: "pagerts",
    name: "PagertsPage",
    path: "/pagerts",
    Component: null as unknown as React.ComponentType<Record<string, unknown>>,
  },
  {
    id: "not-found",
    name: "NotFoundPage",
    path: "/404",
    Component: null as unknown as React.ComponentType<Record<string, unknown>>,
  },
];

const DEFAULT_PAGES: PageInfo[] = INITIAL_REGISTRY;

type State = {
  currentPageId: string;
  currentPagePath: string;
  registry: PageInfo[];
};

type Action =
  | { type: "INITIALIZE"; currentPage: string; currentPagePath: string }
  | { type: "ROUTE_TO_PATH"; path: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "INITIALIZE":
      return {
        ...state,
        currentPageId: action.currentPage,
        currentPagePath: action.currentPagePath,
      };
    case "ROUTE_TO_PATH":
      return {
        ...state,
        currentPagePath: action.path,
        currentPageId: findPageIdByPath(action.path),
      };
    default:
      return state;
  }
}

function findPageIdByPath(path: string): string {
  const page = DEFAULT_PAGES.find((page) => page.path === path);
  return page?.id || "not-found";
}


// FIXME: code smell
// export interface UsePagesWithDynamicComponentOptions {
//   /** Normalize a raw pathname into a canonical route path. */
//   normalizePath: (path: string) => string;
//   /** Whether a href is an internal path (vs. external URL). */
//   isInternalPath: (href: string) => boolean;
//   /** Callback to handle page navigation (useful for analytics). */
//   onPageNavigate?: (pageId: string) => void;
//   /** Allow custom page component registration via config. */
//   customPageConfig: ReadonlyArray<{
//     id: string;
//     name: string;
//     path: string;
//     Component: React.ComponentType<Record<string, unknown>>;
//   }>;
// }

export function usePages(pageConfig: typeof pages) {

  const [state, dispatch] = useReducer(reducer, {
    currentPageId: "home",
    currentPagePath: "/",
    registry: DEFAULT_PAGES,
  });

  // the rest of this function is invalid 
  // useEffect(() => {
  //   const currentPath = normalizePath(window.location.pathname);
  //   initializeState(currentPath);
  // }, [normalizePath]);

  // useEffect(() => {
  //   const currentPath = normalizePath(window.location.pathname);
  //   initializeState(currentPath);
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, []);

  // const initializeState = useCallback((path: string) => {
  //   const currentPageId = findPageIdByPath(path);
  //   dispatch({
  //     type: "INITIALIZE",
  //     currentPage: currentPageId,
  //     currentPagePath: path,
  //   });
  // }, []);

  // const navigate = useCallback(
  //   (href: string) => {
  //     if (!isInternalPath(href)) {
  //       window.location.assign(href);
  //       return;
  //     }

  //     const currentPath = normalizePath(window.location.pathname);
  //     const nextPath = normalizePath(href);

  //     if (currentPath === nextPath && window.location.search === "") {
  //       return;
  //     }

  //     const { pathname, search, hash } = window.location;

  //     if (hash) {
  //       window.history.replaceState({}, "", `${pathname}${search}${hash}`);
  //     }

  //     const hrefPath = href.split("#")[0]?.split("?")[0] || href;
  //     window.history.pushState({}, "", hrefPath);
  //     dispatch({
  //       type: "ROUTE_TO_PATH",
  //       path: nextPath,
  //     });

  //     if (onPageNavigate) {
  //       onPageNavigate(
  //         nextPath.split("/")[1]?.replace(/[^a-z0-9-]/gi, "") || "home",
  //       );
  //     }
  //   },
  //   [normalizePath, isInternalPath, onPageNavigate],
  // );

  // return {
  //   currentPageId: state.currentPageId,
  //   currentPagePath: state.currentPagePath,
  //   navigate,
  //   getCurrentPageId: () => state.currentPageId,
  //   getCurrentPagePath: () => state.currentPagePath,
  //   getRegistry: () => state.registry,
  // };
  return null;
}
