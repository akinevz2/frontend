import type React from "react"

export type Content = string | string[] | SectionProps[]

export type Heading = string
export type SectionProps = {
    className?: string
    heading?: Heading
    content?: Content
    children?: React.ReactNode[]
}

function renderHeading(heading: Heading) {
    if (typeof heading === "string")
        return <h1>{heading}</h1>
    return heading
}

function renderContent(content: Content) {
    if (typeof content === "string")
        return <ul><li>{content}</li></ul>
    return <ul>
        {
            content.map((text, index) => (
                typeof text == "string" ?
                    <li key={index}>{text}</li> :
                    <Section key={index} {...text} />
            ))
        }
    </ul>
}


export const Section = (props: SectionProps) => {
    const { heading, content, className, children } = props
    const hasHeading = !!heading
    const hasContent = !!content
    return <>
        <section className={className}>
            {hasHeading ? renderHeading(heading) : null}
            {hasContent ? renderContent(content) : null}
            {children}
        </section>
    </>
}