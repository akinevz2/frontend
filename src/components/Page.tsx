import { Section, type SectionProps } from "./Section"

export type PageProps = {
    sections?: SectionProps | SectionProps[]
}
export const Page = (props: PageProps) => {
    const sections = props.sections ?? []
    const isMultiple = Array.isArray(sections)
    if (isMultiple)
        return <section className="page"> {sections.map((section, index) => (<Section key={index} {...section} />))} </section>
    return <Section className="page" {...sections} />
}