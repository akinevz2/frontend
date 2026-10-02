import { useEffect, useRef, useState } from "react";

interface HistoryState {
  scrollPosition: number;
  expandedSections?: string[];
  metadata?: Record<string, unknown>;
}

interface HistoryStatePreserved {
  scrollPosition: number;
  expandedSections?: Set<string>;
  metadata?: Record<string, unknown>;
}

interface UseHistoryStateOptions {
  enabled?: boolean;
  scrollKey?: string;
  expandedKey?: string;
  metadataKey?: string;
}

export function useHistoryState({
  enabled = true,
  scrollKey = "scrollPosition",
  expandedKey = "expandedSections",
  metadataKey = "metadata",
}: UseHistoryStateOptions = {}) {
  const [state, setState] = useState<HistoryState>({
    scrollPosition: 0,
    expandedSections: [],
    metadata: {},
  });

  const previousStateRef = useRef<HistoryStatePreserved>({
    scrollPosition: 0,
    expandedSections: new Set(),
    metadata: {},
  });

  const saveState = (newState: Partial<HistoryState>) => {
    if (!enabled) return;

    const preservedState: HistoryStatePreserved = {
      scrollPosition:
        newState.scrollPosition ?? previousStateRef.current.scrollPosition,
      expandedSections: newState.expandedSections
        ? new Set(newState.expandedSections)
        : previousStateRef.current.expandedSections,
      metadata: { ...previousStateRef.current.metadata },
    };

    if (newState.metadata) {
      preservedState.metadata = {
        ...preservedState.metadata,
        ...newState.metadata,
      };
    }

    window.history.replaceState(preservedState, "", window.location.href);

    previousStateRef.current = preservedState;
    setState(newState);
  };

  const restoreState = () => {
    if (!enabled) return;

    const preservedState: HistoryStatePreserved = (window.history
      .state as HistoryStatePreserved) || {
      scrollPosition: 0,
      expandedSections: new Set(),
      metadata: {},
    };

    previousStateRef.current = preservedState;
    setState({
      scrollPosition: preservedState.scrollPosition,
      expandedSections: Array.from(preservedState.expandedSections),
      metadata: preservedState.metadata,
    });
  };

  const scrollToPosition = (position: number) => {
    window.scrollTo(0, position);
    saveState({ scrollPosition: position });
  };

  const toggleSection = (sectionId: string, expanded: boolean) => {
    const currentSections = new Set(state.expandedSections);
    if (expanded) {
      currentSections.add(sectionId);
    } else {
      currentSections.delete(sectionId);
    }
    saveState({ expandedSections: Array.from(currentSections) });
  };

  const setMetadata = (key: string, value: unknown) => {
    saveState({
      metadata: {
        ...state.metadata,
        [key]: value,
      },
    });
  };

  return {
    state,
    saveState,
    restoreState,
    scrollToPosition,
    toggleSection,
    setMetadata,
  };
}
