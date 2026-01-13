import { createContext } from "react";
import type { PageMetadata } from "./types";

export type SectionContextType = {
  expandedSections: Set<string>;
  markAsExpanded: (heading: string) => void;
  minimizedSections: Map<string, string>; // Map<uuid, heading>
  minimizeSection: (uuid: string, heading: string) => void;
  restoreSection: (uuid: string) => void;
  pageMetadata: PageMetadata;
};

export const SectionContext = createContext<SectionContextType | undefined>(undefined);
