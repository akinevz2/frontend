import { Addon, AddonList, type AddonProps } from "./Addon";
import { Section, SectionProvider, type SectionProps, type PageMetadata } from "../windowing";
import { MenuBarWithContext } from "./MenuBarWithContext";

export type PageProps = {
  sections?: SectionProps | SectionProps[];
  addons?: AddonProps | AddonProps[];
  pageMetadata?: PageMetadata;
};

export const PageContent = ({ sections, pageMetadata }: PageProps) => {
  const metadata = pageMetadata || { sections: [] };
  const isArray = Array.isArray(sections);
  
  console.log('PageContent render:', { sections, metadata, isArray });
  
  if (isArray) {
    return (
      <SectionProvider pageMetadata={metadata}>
        <section className="page">
          {sections.map((section, index) => (
            <Section key={section.uuid || index} {...section} />
          ))}
        </section>
        <MenuBarWithContext />
      </SectionProvider>
    );
  }
  
  if (sections) {
    return (
      <SectionProvider pageMetadata={metadata}>
        <Section className="page" {...sections} />
        <MenuBarWithContext />
      </SectionProvider>
    );
  }
  
  return null;
};

export const PageWithAddons = ({ addons, pageMetadata }: PageProps) => {
  const metadata = pageMetadata || { sections: [] };
  const isArray = Array.isArray(addons);
  
  if (isArray) {
    return (
      <SectionProvider pageMetadata={metadata}>
        <section className="page">
          {addons.map((section, index) => (
            <Addon key={section.uuid || index} {...section} />
          ))}
        </section>
        <MenuBarWithContext />
      </SectionProvider>
    );
  }
  
  if (addons) {
    return (
      <SectionProvider pageMetadata={metadata}>
        <AddonList className="page" {...addons} />
        <MenuBarWithContext />
      </SectionProvider>
    );
  }
  
  return null;
};
