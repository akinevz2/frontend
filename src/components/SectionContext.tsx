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
};

const SectionContext = createContext<SectionContextType | undefined>(undefined);

const STORAGE_KEY = "expandedWhatIsKine";

export const SectionProvider = ({ children }: { children: ReactNode }) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    // Check localStorage on mount
    const hasExpanded = localStorage.getItem(STORAGE_KEY);
    if (hasExpanded === "true") {
      setExpandedSections(new Set(["what is kine"]));
    }
  }, []);

  const markAsExpanded = (heading: string) => {
    setExpandedSections((prev) => new Set(prev).add(heading));
    if (heading === "what is kine") {
      localStorage.setItem(STORAGE_KEY, "true");
    }
  };

  return (
    <SectionContext.Provider value={{ expandedSections, markAsExpanded }}>
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
