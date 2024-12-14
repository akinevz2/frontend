import { Section, type SectionProps } from "./Section"

export type PageProps = {
    sections?: SectionProps[]
}
export const Page = (props: PageProps) => {
    const sections = props.sections ?? []
    return <div className="page">
        {sections.map((section, index) => (
            <Section key={index} {...section} />
        ))}
    </div>
}