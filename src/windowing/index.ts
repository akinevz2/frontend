// Main exports for the windowing subsystem (client-safe)
export { Section, MusicTrackSection } from "./Section";
export type { MusicTrack, MusicSource } from "./types";
export { SectionProvider } from "./provider";
export { SectionContext, type SectionContextType } from "./context";
export { useSectionContext, useIsAnyWindowMaximized } from "./hooks";
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
