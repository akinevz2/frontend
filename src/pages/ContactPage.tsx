import { useMemo } from "react";
import { PageContent } from "../components/Page";
import { processContent } from "../windowing/utils.ts";
import type { SectionProps } from "../windowing";
import contacts from "../../contacts.json";

const ContactPage = () => {
  const { processed, metadata } = useMemo(
    () => processContent(contacts as SectionProps),
    [],
  );

  return (
    <main>
      <PageContent sections={processed} pageMetadata={{ sections: metadata }} />
    </main>
  );
};

export default ContactPage;
