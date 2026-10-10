import {
  createContext,
  useContext,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export interface SectionState {
  isCollapsed: boolean;
  toggleCollapsed: () => void;
  setCollapsed: (collapsed: boolean) => void;
}

interface SectionContextValue {
  getState: (uuid: string) => SectionState | undefined;
  ensureState: (uuid: string) => SectionState;
  subscribe: (uuid: string, listener: () => void) => () => void;
}

const SectionContext = createContext<SectionContextValue | null>(null);

export function SectionProvider({ children }: { children: ReactNode }) {
  const [states] = useState(new Map<string, SectionState>());
  const [listeners] = useState(new Map<string, Set<() => void>>());

  const ensureState = (uuid: string): SectionState => {
    let state = states.get(uuid);
    if (!state) {
      state = {
        isCollapsed: true,
        toggleCollapsed: () => {
          state!.isCollapsed = !state!.isCollapsed;
          listeners.get(uuid)?.forEach((listener) => listener());
        },
        setCollapsed: (collapsed: boolean) => {
          state!.isCollapsed = collapsed;
          listeners.get(uuid)?.forEach((listener) => listener());
        },
      };
      states.set(uuid, state);
    }
    return state;
  };

  const getValue: SectionContextValue = {
    getState: (uuid) => states.get(uuid),
    ensureState,
    subscribe: (uuid, listener) => {
      let sectionListeners = listeners.get(uuid);
      if (!sectionListeners) {
        sectionListeners = new Set();
        listeners.set(uuid, sectionListeners);
      }
      sectionListeners.add(listener);
      return () => {
        sectionListeners!.delete(listener);
        if (sectionListeners!.size === 0) {
          listeners.delete(uuid);
        }
      };
    },
  };

  return (
    <SectionContext.Provider value={getValue}>
      {children}
    </SectionContext.Provider>
  );
}

export function useSection(uuid: string): SectionState {
  const context = useContext(SectionContext);
  if (!context) {
    throw new Error("useSection must be used within a SectionProvider");
  }
  const state = context.ensureState(uuid);
  const isCollapsed = useSyncExternalStore(
    (listener) => context.subscribe(uuid, listener),
    () => context.getState(uuid)?.isCollapsed ?? true,
    () => context.getState(uuid)?.isCollapsed ?? true,
  );
  return { ...state, isCollapsed };
}

export function useSectionState(uuid: string): SectionState | undefined {
  const context = useContext(SectionContext);
  if (!context) {
    throw new Error("useSectionState must be used within a SectionProvider");
  }
  useSyncExternalStore(
    (listener) => context.subscribe(uuid, listener),
    () => context.getState(uuid)?.isCollapsed ?? true,
    () => context.getState(uuid)?.isCollapsed ?? true,
  );
  return context.getState(uuid);
}
