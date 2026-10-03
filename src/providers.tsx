import {
  useReducer,
  useCallback,
  type ReactNode,
} from "react";
import {
  PageSectionContext,
  ErrorContext,
  type ErrorContextValue,
} from "./context";
import type { PageMetadata, SectionMetadata } from "./types";
import { ErrorMessage } from "./ErrorMessage";

export interface SectionState {
  expandedSections: Set<string>;
  minimizedSections: Map<string, string>;
  maximizedWindows: Set<string>;
}

export type SectionAction =
  | { type: "MARK_AS_EXPANDED"; heading: string }
  | { type: "MINIMIZE_SECTION"; uuid: string; heading: string }
  | { type: "RESTORE_SECTION"; uuid: string }
  | { type: "REGISTER_MAXIMIZED_WINDOW"; uuid: string }
  | { type: "UNREGISTER_MAXIMIZED_WINDOW"; uuid: string };

export function sectionReducer(
  state: SectionState,
  action: SectionAction,
  pageMetadata: PageMetadata,
): SectionState {
  switch (action.type) {
    case "MARK_AS_EXPANDED":
      return {
        ...state,
        expandedSections: new Set(state.expandedSections).add(action.heading),
      };
    case "MINIMIZE_SECTION":
      return {
        ...state,
        minimizedSections: new Map(state.minimizedSections).set(
          action.uuid,
          action.heading,
        ),
      };
    case "RESTORE_SECTION":
      const newMinimizedSections = new Map(state.minimizedSections);
      newMinimizedSections.delete(action.uuid);
      const ancestors = getAncestorSectionUuids(
        action.uuid,
        pageMetadata.sections,
      );
      ancestors.forEach((ancestorUuid) => {
        newMinimizedSections.delete(ancestorUuid);
      });
      return { ...state, minimizedSections: newMinimizedSections };
    case "REGISTER_MAXIMIZED_WINDOW":
      return {
        ...state,
        maximizedWindows: new Set(state.maximizedWindows).add(action.uuid),
      };
    case "UNREGISTER_MAXIMIZED_WINDOW":
      const newMaximizedWindows = new Set(state.maximizedWindows);
      newMaximizedWindows.delete(action.uuid);
      return { ...state, maximizedWindows: newMaximizedWindows };
    default: {
      const _exhaustive: never = action;
      void _exhaustive;
      return state;
    }
  }
}

const getAncestorSectionUuids = (
  uuid: string,
  sectionMetadata: SectionMetadata[],
): string[] => {
  const sectionIndex = sectionMetadata.findIndex(
    (section) => section.uuid === uuid,
  );

  if (sectionIndex === -1) {
    return [];
  }

  const currentSection = sectionMetadata[sectionIndex];
  if (!currentSection) {
    return [];
  }

  let expectedDepth = currentSection.depth - 1;
  const ancestors: string[] = [];

  for (let i = sectionIndex - 1; i >= 0 && expectedDepth >= 0; i--) {
    const candidate = sectionMetadata[i];
    if (candidate && candidate.depth === expectedDepth) {
      ancestors.push(candidate.uuid);
      expectedDepth -= 1;
    }
  }

  return ancestors;
};

const sectionReducerWrapper = (
  state: SectionState,
  action: SectionAction,
  pageMetadata: PageMetadata,
) => {
  return sectionReducer(state, action, pageMetadata);
};

const useSectionState = (pageMetadata: PageMetadata) => {
  const [state, dispatch] = useReducer(
    (state, action) => sectionReducer(state, action, pageMetadata),
    {
      expandedSections: new Set(),
      minimizedSections: new Map(),
      maximizedWindows: new Set(),
    },
  );

  const markAsExpanded = useCallback((heading: string) => {
    dispatch({ type: "MARK_AS_EXPANDED", heading });
  }, []);

  const minimizeSection = useCallback((uuid: string, heading: string) => {
    dispatch({ type: "MINIMIZE_SECTION", uuid, heading });
  }, []);

  const restoreSection = useCallback((uuid: string) => {
    dispatch({ type: "RESTORE_SECTION", uuid });
  }, []);

  const registerMaximizedWindow = useCallback((uuid: string) => {
    dispatch({ type: "REGISTER_MAXIMIZED_WINDOW", uuid });
  }, []);

  const unregisterMaximizedWindow = useCallback((uuid: string) => {
    dispatch({ type: "UNREGISTER_MAXIMIZED_WINDOW", uuid });
  }, []);

  return {
    state,
    dispatch,
    markAsExpanded,
    minimizeSection,
    restoreSection,
    registerMaximizedWindow,
    unregisterMaximizedWindow,
  };
};

export const SectionProvider = ({
  children,
  pageMetadata,
  isAddonPage = false,
}: {
  children: ReactNode;
  pageMetadata: PageMetadata;
  /** When true, sections on this page render with addon behaviour. */
  isAddonPage?: boolean;
}) => {
  const {
    state,
    markAsExpanded,
    minimizeSection,
    restoreSection,
    registerMaximizedWindow,
    unregisterMaximizedWindow,
  } = useSectionState(pageMetadata);

  return (
    <PageSectionContext.Provider
      value={{
        expandedSections: state.expandedSections,
        markAsExpanded,
        minimizedSections: state.minimizedSections,
        minimizeSection,
        restoreSection,
        pageMetadata,
        maximizedWindows: state.maximizedWindows,
        registerMaximizedWindow,
        unregisterMaximizedWindow,
        isAddonPage,
      }}
    >
      {children}
    </PageSectionContext.Provider>
  );
};

export interface ErrorProviderProps {
  children: ReactNode;
  setError: (error: Error | null) => void;
}

export const ErrorProvider = ({ children, setError }: ErrorProviderProps) => {
  return (
    <ErrorContext.Provider value={{ error: null, setError }}>
      {children}
    </ErrorContext.Provider>
  );
};

export const GlobalErrorBoundary = () => {
  return <div>GlobalErrorBoundary component needs implementation</div>;
};

export interface ErrorDisplayProps {
  error: Error | null;
  onClose?: () => void;
}

export function ErrorDisplay({ error, onClose }: ErrorDisplayProps) {
  if (!error) return null;

  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
    }
  }, [onClose]);

  return (
    <div className="error-overlay">
      <div className="error-speech-bubble">
        <div className="error-speech-bubble-header">
          <span className="error-icon">⚠️</span>
          <span className="error-title">System Error</span>
          {onClose && (
            <button
              className="error-close-btn"
              onClick={handleClose}
              title="Close error message"
            >
              ✕
            </button>
          )}
        </div>
        <div className="error-speech-bubble-body">
          <p className="error-message">{error.message}</p>
          {error.stack && process.env.NODE_ENV === "development" && (
            <div className="error-stack">
              <details>
                <summary>Error details</summary>
                <pre>{error.stack}</pre>
              </details>
            </div>
          )}
        </div>
      </div>
      <img
        src="/Clippy.png"
        alt="Clippy Assistant"
        className="error-clippy"
      />
    </div>
  );
}

export const ErrorBoundary = () => {
  return <div>ErrorBoundary component needs implementation</div>;
};
