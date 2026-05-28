import { Addon, AddonList, type AddonProps } from "./Addon";
import {
  Section,
  SectionProvider,
  type SectionProps,
  type PageMetadata,
} from "../windowing";
import { MenuBarWithContext } from "./MenuBarWithContext";

export type PageProps = {
  sections?: SectionProps | SectionProps[];
  addons?: AddonProps | AddonProps[];
  pageMetadata?: PageMetadata;
};

export const PageContent = ({ sections, pageMetadata }: PageProps) => {
  const metadata = pageMetadata || { sections: [] };

  console.log("PageContent render:", {
    sections,
    metadata,
    isArray: Array.isArray(sections),
  });

  if (!sections) {
    return null;
  }

  return (
    <SectionProvider pageMetadata={metadata}>
      <section className="page">
        {Array.isArray(sections)
          ? sections.map((item, index) => (
            <Section key={item.uuid || index} {...item} />
          ))
          : <Section {...sections} />}
      </section>
      <MenuBarWithContext />
    </SectionProvider>
  );
};

export const PageWithAddons = ({ addons, pageMetadata }: PageProps) => {
  const metadata = pageMetadata || { sections: [] };

  if (!addons) {
    return null;
  }

  return (
    <SectionProvider pageMetadata={metadata}>
      <section className="page">
        {Array.isArray(addons)
          ? addons.map((item, index) => (
            <Addon key={item.uuid || index} {...item} />
          ))
          : <AddonList {...addons} />}
      </section>
      <MenuBarWithContext />
    </SectionProvider>
  );
};
