import { Section, type SectionProps } from "../windowing";

/**
 * AddonProps is a section with the addon extension fields. Since these fields
 * (`status`, `text`, `externalLink`) now live on `SectionProps`, `AddonProps`
 * is just `SectionProps` kept under its old name for call-site compatibility.
 */
export type AddonProps = SectionProps;

/** @deprecated Use `SectionProps` directly — kept for legacy imports. */
export type AddonContent = NonNullable<SectionProps["content"]>;

/**
 * `Addon` is an extension of `Section` for the addons page. It forwards all
 * props to `Section` and opts into addon behaviour:
 *  - `externalLink: true` so the title-bar link opens in a new tab.
 * Whether the section renders its addon extras (status / copy-to-clipboard) is
 * decided by the page it lives on (see `SectionProvider`'s `isAddonPage`),
 * not by this wrapper.
 */
export const Addon = (props: AddonProps) => (
  <Section {...props} externalLink={true} />
);

/** Single-addon variant — identical to `Addon`, kept for the non-array case. */
export const AddonList = (props: AddonProps) => (
  <Section {...props} externalLink={true} />
);
