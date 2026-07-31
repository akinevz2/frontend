import { useReducer, useCallback, useEffect } from "react";

/**
 * Reducer + hook for the webpage routing state machine.
 *
 * Owns the current normalized `path` and the `navigate` action. The popstate
 * listener (back/forward buttons) is wired here so route state stays
 * self-contained instead of living as loose `useState` + a `useEffect` in
 * App.tsx.
 *
 * `normalizePath` and `isInternalPath` are injected so this module stays
 * free of App.tsx-specific helpers.
 */

export interface RoutingState {
    /** Normalized current path, e.g. "/", "/blog", "/addons". */
    path: string;
}

export type RoutingAction =
    | { type: "NAVIGATE"; href: string; normalized: string }
    | { type: "POPSTATE"; normalized: string };

export function routingReducer(
    state: RoutingState,
    action: RoutingAction,
): RoutingState {
    switch (action.type) {
        case "NAVIGATE":
            return { path: action.normalized };
        case "POPSTATE":
            return { path: action.normalized };
        default: {
            const _exhaustive: never = action;
            void _exhaustive;
            return state;
        }
    }
}

export interface UseRoutingOptions {
    /** Normalize a raw pathname into a canonical route path. */
    normalizePath: (path: string) => string;
    /** Whether a href is an internal path (vs. external URL). */
    isInternalPath: (href: string) => boolean;
}

export function useRouting({
    normalizePath,
    isInternalPath,
}: UseRoutingOptions) {
    const [state, dispatch] = useReducer(routingReducer, undefined, () => ({
        path: normalizePath(
            typeof window !== "undefined" ? window.location.pathname : "/",
        ),
    }));

    // Keep route state in sync with browser back/forward navigation.
    useEffect(() => {
        const onPopState = () => {
            dispatch({
                type: "POPSTATE",
                normalized: normalizePath(window.location.pathname),
            });
        };

        window.addEventListener("popstate", onPopState);
        return () => {
            window.removeEventListener("popstate", onPopState);
        };
    }, [normalizePath]);

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

            const current = normalizePath(window.location.pathname);
            const next = normalizePath(href);

            if (current === next && window.location.search === "") {
                return;
            }

            const { pathname, search, hash } = window.location;
            if (hash) {
                window.history.replaceState({}, "", `${pathname}${search}${hash}`);
            }

            window.history.pushState({}, "", href);
            dispatch({ type: "NAVIGATE", href, normalized: next });
        },
        [isInternalPath, normalizePath],
    );

    return { state, navigate };
}