import { useEffect, useState } from "react";

import { PageContent } from "./Page";
import { processContent } from "../windowing/utils";
import type { PageMetadata, SectionProps } from "../windowing";

type MusicTrack = {
  path: string;
  title: string;
  url: string;
};

type MusicPayload = {
  source: string;
  generatedAt: string;
  trackCount: number;
  tracks: MusicTrack[];
};

type MusicState = {
  sections?: SectionProps | SectionProps[];
  metadata: PageMetadata;
  error?: string;
};

const LOADING_SECTION: SectionProps = {
  heading: "Loading...",
  content: [
    "![Loading spinner](/spinner.svg)",
    "Fetching tracks from /soundcloud.json",
  ],
};

const buildState = (content: SectionProps | SectionProps[]): MusicState => {
  const { processed, metadata } = processContent(content);
  return {
    sections: processed,
    metadata: { sections: metadata },
  };
};

const toMusicSections = (payload: MusicPayload): SectionProps[] => {
  const trackList = payload.tracks.map(
    (track) => `- [${track.title}](${track.url})`,
  );

  return [
    {
      heading: "Favorite Uploads",
      content:
        trackList.length > 0
          ? [
              `Generated: ${new Date(payload.generatedAt).toLocaleString()}`,
              `Track count: ${payload.trackCount}`,
              ...trackList,
            ]
          : ["No tracks found in this snapshot."],
    },
    {
      heading: "Source",
      content: [`Likes page: [${payload.source}](${payload.source})`],
    },
  ];
};

const isMusicPayload = (value: unknown): value is MusicPayload => {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<MusicPayload>;
  return (
    typeof candidate.source === "string" &&
    typeof candidate.generatedAt === "string" &&
    typeof candidate.trackCount === "number" &&
    Array.isArray(candidate.tracks)
  );
};

export default function MusicContent() {
  const [musicState, setMusicState] = useState<MusicState>(() =>
    buildState(LOADING_SECTION),
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch("/soundcloud.json", {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const payload: unknown = await response.json();
        if (!isMusicPayload(payload)) {
          throw new Error("Invalid music payload schema");
        }

        if (!cancelled) {
          setMusicState(buildState(toMusicSections(payload)));
        }
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error ? error.message : "Unknown error";
          setMusicState({
            sections: undefined,
            metadata: { sections: [] },
            error: `Failed to load music data (${message}).`,
          });
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      {musicState.error ? (
        <p className="status-bar">{musicState.error}</p>
      ) : null}
      <PageContent
        sections={musicState.sections}
        pageMetadata={musicState.metadata}
      />
    </>
  );
}
