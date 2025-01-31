import { Addon, AddonList, type AddonProps } from "./Addon";
import { Section, type SectionProps } from "./Section";

export type PageProps = {
    sections?: SectionProps | SectionProps[]
    addons?: AddonProps | AddonProps[]
}

export const PageContent = ({ sections }: PageProps) => {
    const isArray = Array.isArray(sections)
    if (isArray)
        return <section className="page"> {sections.map((section, index) => (<Section key={index} {...section} />))} </section>
    if (sections)
        return <Section className="page" {...sections} />
}

export const PageWithAddons = ({ addons }: PageProps) => {
    const isArray = Array.isArray(addons)
    if (isArray)
        return <section className="page"> {addons.map((section, index) => (<Addon key={index} {...section} />))} </section>
    if (addons)
        return <AddonList className="page" {...addons} />
}