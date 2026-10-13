import { useEffect } from "react";
import { sections, soundcloud } from "@/content";
import { buildMusicGroupSchema, serializeJsonLd } from "@/lib/musicSchema";
import { PageWindows } from "@/window";

const SCRIPT_ID = "homepage-music-structured-data";

export const HomePage = () => {
  useEffect(() => {
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.type = "application/ld+json";
    script.textContent = serializeJsonLd(
      buildMusicGroupSchema(soundcloud.tracks),
    );
    document.head.appendChild(script);
    return () => script.remove();
  }, []);

  return <PageWindows content={sections} />;
};
