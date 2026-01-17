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

type RenderItemProps = {
  item: SectionProps | AddonProps;
  index: number;
  ComponentType: typeof Section | typeof Addon;
};

const RenderItem = ({ item, index, ComponentType }: RenderItemProps) => (
  <ComponentType key={item.uuid || index} {...item} />
);

type PageWrapperProps = {
  items: SectionProps | SectionProps[] | AddonProps | AddonProps[] | undefined;
  metadata: PageMetadata;
  SingleComponent: typeof Section | typeof AddonList;
  MultiComponent: typeof Section | typeof Addon;
};

const PageWrapper = ({
  items,
  metadata,
  SingleComponent,
  MultiComponent,
}: PageWrapperProps) => {
  if (!items) return null;

  const isArray = Array.isArray(items);

  return (
    <SectionProvider pageMetadata={metadata}>
      <section className="page">
        {isArray ? (
          items.map((item, index) => (
            <RenderItem
              key={item.uuid || index}
              item={item}
              index={index}
              ComponentType={MultiComponent}
            />
          ))
        ) : (
          <SingleComponent {...items} />
        )}
      </section>
      <MenuBarWithContext />
    </SectionProvider>
  );
};

export const PageContent = ({ sections, pageMetadata }: PageProps) => {
  const metadata = pageMetadata || { sections: [] };

  console.log("PageContent render:", {
    sections,
    metadata,
    isArray: Array.isArray(sections),
  });

  return (
    <PageWrapper
      items={sections}
      metadata={metadata}
      SingleComponent={Section}
      MultiComponent={Section}
    />
  );
};

export const PageWithAddons = ({ addons, pageMetadata }: PageProps) => {
  const metadata = pageMetadata || { sections: [] };

  return (
    <PageWrapper
      items={addons}
      metadata={metadata}
      SingleComponent={AddonList}
      MultiComponent={Addon}
    />
  );
};
