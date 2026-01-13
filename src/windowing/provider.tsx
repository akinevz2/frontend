import {
  useState,
  type ReactNode,
} from "react";
import { SectionContext } from "./context";
import type { PageMetadata } from "./types";

export const SectionProvider = ({ children, pageMetadata }: { children: ReactNode; pageMetadata: PageMetadata }) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set()
  );
  const [minimizedSections, setMinimizedSections] = useState<Map<string, string>>(
    new Map()
  );

  const markAsExpanded = (heading: string) => {
    setExpandedSections((prev) => new Set(prev).add(heading));
  };

  const minimizeSection = (uuid: string, heading: string) => {
    setMinimizedSections((prev) => new Map(prev).set(uuid, heading));
  };

  const restoreSection = (uuid: string) => {
    setMinimizedSections((prev) => {
      const newMap = new Map(prev);
      newMap.delete(uuid);
      return newMap;
    });
  };

  return (
    <SectionContext.Provider value={{ expandedSections, markAsExpanded, minimizedSections, minimizeSection, restoreSection, pageMetadata }}>
      {children}
    </SectionContext.Provider>
  );
};
