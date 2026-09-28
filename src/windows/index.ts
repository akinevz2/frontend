// Main exports for the windowing subsystem (client-safe)
export { Section, MusicTrackSection } from "./Section";
export type { MusicTrack, MusicSource } from "./types.d.ts";
export { SectionProvider } from "./providers.tsx";
export { SectionContext, type SectionContextType } from "./context.tsx";
export { useSectionContext, useIsAnyWindowMaximized } from "./hooks.ts";
export { MinimizedSections } from "./MinimizedSections.tsx";
export { OkButton } from "./OkButton.tsx";
export type {
  SectionProps,
  Content as SectionContent,
  Heading,
  PageMetadata,
  SectionMetadata,
  ContentWithUUID,
} from "./types.d.ts";
