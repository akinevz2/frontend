import { useMemo } from "react";
import { processContent } from "../utils";
import sections from "./structure/sections.json";
import { usePageContent } from "../components/ContentProvider";

const HomePage = () => {
  const pageContent = usePageContent();
  const pageMetadata = usePageMetadata();

  // Process the sections content for rendering
  const processed = useMemo(() => processContent(sections), [sections]);

  // Metadata for the page, including sections
  return (
    <main>
      <PageContent sections={processed} pageMetadata={{ sections: metadata }} />
    </main>
  );
};

export default HomePage;
