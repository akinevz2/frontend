import { useMemo } from "react";
import { PageContent } from "../components/Page";
import { processContent } from "../windows/utils";
import type { SectionProps } from "../windows";
import sections from "./structure/sections.json";

const HomePage = () => {
  const { processed, metadata } = useMemo(
    () => processContent(sections as SectionProps),
    [],
  );

  return (
    <main>
      <PageContent sections={processed} pageMetadata={{ sections: metadata }} />
    </main>
  );
};

export default HomePage;
