/**
 * SectionProvider - Section State Management
 *
 * This provider manages the state for section utilities including:
 * - Section expansion/restore functionality
 * - Addon page detection
 * - Window state for minimal sections
 */

import { createContext, useContext, useState, type ReactNode } from "react";

interface SectionProviderState {
  isWindowMaximized: boolean;
  children: ReactNode[];
  markAsExpanded: (id: string) => void;
  restoreSection: (id: string) => void;
  isAddonPage: boolean;
}

const SectionContext = createContext<SectionProviderState | null>(null);

export function SectionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [isWindowMaximized, setIsWindowMaximized] = useState(false);
  const [childrenList, setChildrenList] = useState<ReactNode[]>([]);
  const [isAddonPage, setIsAddonPage] = useState(false);

  const markAsExpanded = (id: string) => {
    console.log(`Marking section as expanded: ${id}`);
  };

  const restoreSection = (id: string) => {
    console.log(`Restoring section: ${id}`);
  };

  const value = {
    isWindowMaximized,
    children: childrenList,
    markAsExpanded,
    restoreSection,
    isAddonPage,
  };

  return (
    <SectionContext.Provider value={value}>
      {children}
    </SectionContext.Provider>
  );
}

export function useSectionContext() {
  const context = useContext(SectionContext);
  if (!context) {
    throw new Error(
      "useSectionContext must be used within a SectionProvider",
    );
  }
  return context;
}