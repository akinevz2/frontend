import { useMemo } from "react";
import { PageContent } from "../components/Page";
import { processContent } from "../windowing/utils.ts";
import type { SectionProps } from "../windowing";
import sections from "../../sections.json";

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
