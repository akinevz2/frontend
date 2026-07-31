import { Addon, AddonList, type AddonProps } from "./Addon";
import {
  Section,
  SectionProvider,
  type SectionProps,
  type PageMetadata,
} from "../windowing";
import { MenuBarWithContext } from "./MenuBarWithContext";
import type React from "react";

export type PageProps = {
  sections?: SectionProps | SectionProps[];
  addons?: AddonProps | AddonProps[];
  pageMetadata?: PageMetadata;
  footer?: React.ReactNode;
};

export const PageContent = ({ sections, pageMetadata, footer }: PageProps) => {
  const metadata = pageMetadata || { sections: [] };

  if (!sections) {
    return null;
  }

  return (<>
    <SectionProvider pageMetadata={metadata}>

      <MenuBarWithContext />
      <section className="page">
        {Array.isArray(sections) ? (
          sections.map((item, index) => (
            <Section key={item.uuid || index} {...item} />
          ))
        ) : (
          <Section {...sections} />
        )}
      </section>
      {footer}
    </SectionProvider>
  </>
  );
};

export const PageWithAddons = ({ addons, pageMetadata }: PageProps) => {
  const metadata = pageMetadata || { sections: [] };

  if (!addons) {
    return null;
  }

  return (
    <SectionProvider pageMetadata={metadata}>
      <MenuBarWithContext />
      <section className="page">
        {Array.isArray(addons) ? (
          addons.map((item, index) => (
            <Addon key={item.uuid || index} {...item} />
          ))
        ) : (
          <AddonList {...addons} />
        )}
      </section>
    </SectionProvider>
  );
};
