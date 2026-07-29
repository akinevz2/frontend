// Main exports for the windowing subsystem (client-safe)
export { Section } from "./Section";
export { SectionProvider } from "./provider";
export { SectionContext, type SectionContextType } from "./context";
export { useSectionContext } from "./hooks";
export { MinimizedSections } from "./MinimizedSections";
export { OkButton } from "./OkButton";
export type {
  SectionProps,
  Content as SectionContent,
  Heading,
  PageMetadata,
  SectionMetadata,
  ContentWithUUID,
} from "./types";
