import { createContext } from "react";
import type { PageMetadata } from "./types";

export type SectionContextType = {
  expandedSections: Set<string>;
  markAsExpanded: (heading: string) => void;
  minimizedSections: Map<string, string>; // Map<uuid, heading>
  minimizeSection: (uuid: string, heading: string) => void;
  restoreSection: (uuid: string) => void;
  pageMetadata: PageMetadata;
  maximizedWindows: Set<string>; // Set of UUIDs for currently maximized windows
  registerMaximizedWindow: (uuid: string) => void;
  unregisterMaximizedWindow: (uuid: string) => void;
  /** True when the page is the addons page — sections render as addons. */
  isAddonPage: boolean;
};

export const SectionContext = createContext<SectionContextType | undefined>(
  undefined,
);
