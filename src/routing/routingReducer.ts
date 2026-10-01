import { useReducer, useCallback } from "react";

/**
 * Reducer + hook for the webpage routing state machine.
 *
 * Owns the current normalized `path` and the `navigate` action. The popstate
 * listener (back/forward buttons) is wired here so route state stays
 * self-contained.
 *
 */

export interface RoutingState {
  /** Normalized current path, e.g. "/", "/blog", "/addons". */
  path: string;
  /** Optional selection into content structure. */
  cursor?: string;
}

export type RoutingAction =
  { type: "NAVIGATE"; href: string } | { type: "POPSTATE"; path: string };

export function routingReducer(
  state: RoutingState,
  action: RoutingAction,
): RoutingState {
  switch (action.type) {
    case "NAVIGATE":
      return { path: action.href };
    case "POPSTATE":
      return { path: action.path };
    default: {
      const _exhaustive: never = action;
      void _exhaustive;
      return state;
    }
  }
}

const isInternalPath = (href: string) => href.startsWith("/");

export function useRouting() {
  const [state, dispatch] = useReducer(routingReducer, undefined, () => ({
    path: typeof window !== "undefined" ? window.location.pathname : "/",
  }));

  // Keep route state in sync with browser back/forward navigation using browser's native path
  useEffect(() => {
    const onPopState = () => {
      dispatch({
        type: "POPSTATE",
        path: window.location.pathname,
      });
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  /**
   * Navigate to a href. External hrefs delegate to the browser; internal
   * hrefs push a history entry and update route state. The current URL's hash
   * is stamped onto the outgoing history entry first so pressing "back"
   * returns to the section the user was viewing.
   */
  const navigate = useCallback(
    (href: string) => {
      if (!isInternalPath(href)) {
        window.location.assign(href);
        return;
      }

      const { pathname, search, hash } = window.location;
      const hrefPath = href.split("#")[0]?.split("?")[0] || href;

      if (pathname === hrefPath && search === "") {
        return;
      }

      if (hash) {
        window.history.replaceState({}, "", `${pathname}${search}${hash}`);
      }

      window.history.pushState({}, "", hrefPath);
      dispatch({ type: "NAVIGATE", href: hrefPath });
    },
    [isInternalPath],
  );

  return { state, navigate };
}
