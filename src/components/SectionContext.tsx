import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

type SectionContextType = {
  expandedSections: Set<string>;
  markAsExpanded: (heading: string) => void;
  minimizedSections: Map<string, () => void>;
  minimizeSection: (heading: string, restoreCallback: () => void) => void;
  restoreSection: (heading: string) => void;
};

const SectionContext = createContext<SectionContextType | undefined>(undefined);

const STORAGE_KEY = "expandedWhatIsKine";
const MINIMIZED_KEY = "minimizedSections";

export const SectionProvider = ({ children }: { children: ReactNode }) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set()
  );
  const [minimizedSections, setMinimizedSections] = useState<Map<string, () => void>>(
    new Map()
  );

  useEffect(() => {
    // Check localStorage on mount
    const hasExpanded = localStorage.getItem(STORAGE_KEY);
    if (hasExpanded === "true") {
      setExpandedSections(new Set(["what is kine"]));
    }

    // Listen for storage events from other contexts
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === MINIMIZED_KEY && e.newValue) {
        // Sync minimized sections from other context
        try {
          const minimized = JSON.parse(e.newValue);
          setMinimizedSections(new Map(Object.entries(minimized)));
        } catch {
          // Ignore invalid JSON in storage
        }
      }
    };

    // Custom event for same-page updates
    const handleMinimizedUpdate = (e: Event) => {
      const { heading, action } = (e as CustomEvent<{heading: string, action: string}>).detail;
      if (action === 'add') {
        setMinimizedSections(prev => new Map(prev).set(heading, () => {}));
      } else if (action === 'remove') {
        setMinimizedSections(prev => {
          const newMap = new Map(prev);
          newMap.delete(heading);
          return newMap;
        });
      }
    };

    window.addEventListener('storage', handleStorageChange as EventListener);
    window.addEventListener('minimizedUpdate', handleMinimizedUpdate as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange as EventListener);
      window.removeEventListener('minimizedUpdate', handleMinimizedUpdate as EventListener);
    };
  }, []);

  const markAsExpanded = (heading: string) => {
    setExpandedSections((prev) => new Set(prev).add(heading));
    if (heading === "what is kine") {
      localStorage.setItem(STORAGE_KEY, "true");
    }
  };

  const minimizeSection = (heading: string, restoreCallback: () => void) => {
    setMinimizedSections((prev) => new Map(prev).set(heading, restoreCallback));
    
    // Notify other contexts
    window.dispatchEvent(new CustomEvent('minimizedUpdate', {
      detail: { heading, action: 'add' }
    }));
  };

  const restoreSection = (heading: string) => {
    const callback = minimizedSections.get(heading);
    if (callback) {
      callback();
      setMinimizedSections((prev) => {
        const newMap = new Map(prev);
        newMap.delete(heading);
        return newMap;
      });
      
      // Notify other contexts
      window.dispatchEvent(new CustomEvent('minimizedUpdate', {
        detail: { heading, action: 'remove' }
      }));
    }
  };

  return (
    <SectionContext.Provider value={{ expandedSections, markAsExpanded, minimizedSections, minimizeSection, restoreSection }}>
      {children}
    </SectionContext.Provider>
  );
};

export const useSectionContext = () => {
  const context = useContext(SectionContext);
  if (!context) {
    throw new Error("useSectionContext must be used within SectionProvider");
  }
  return context;
};

export const useIsNavBarVisible = () => {
  const { expandedSections } = useSectionContext();
  return expandedSections.has("what is kine");
};
