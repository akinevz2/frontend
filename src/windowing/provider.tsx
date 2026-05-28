import {
  useState,
  type ReactNode,
} from "react";
import { SectionContext } from "./context";
import type { PageMetadata, SectionMetadata } from "./types";

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
      const ancestorUuids = getAncestorSectionUuids(uuid, pageMetadata.sections);

      newMap.delete(uuid);
      ancestorUuids.forEach((ancestorUuid) => {
        newMap.delete(ancestorUuid);
      });

      return newMap;
    });
  };

  return (
    <SectionContext.Provider value={{ expandedSections, markAsExpanded, minimizedSections, minimizeSection, restoreSection, pageMetadata }}>
      {children}
    </SectionContext.Provider>
  );
};
