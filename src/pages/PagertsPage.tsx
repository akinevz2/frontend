import { useMemo } from "react";
import { PageContent } from "../components/Page";
import { processContent } from "../windowing/utils.ts";
import type { SectionProps } from "../windowing";
import content from "../../pagerts.json";

const PagertsPage = () => {
  const { processed, metadata } = useMemo(
    () => processContent(content as SectionProps),
    [],
  );

  return (
    <main>
      <PageContent sections={processed} pageMetadata={{ sections: metadata }} />
    </main>
  );
};

export default PagertsPage;
