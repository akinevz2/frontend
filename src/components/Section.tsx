export type Content = string | string[] | SectionProps[]

export type Heading = string
export type SectionProps = {
    className?: string
    heading?: Heading
    content?: Content
}

export const Section = (props: SectionProps) => {
    const { heading, content, className } = props
    const hasHeading = !!heading
    const hasContent = !!content

    function renderHeading(heading: Heading) {
        return <h1>{heading}</h1>
    }

    function renderContent(content: Content) {
        if (typeof content === "string")
            return <ul><li>{content}</li></ul>
        return <ul>
            {
                content.map((text, index) => (
                    typeof text == "string" ?
                        <li key={index}>{text}</li> :
                        <Section key={index} heading={text.heading} content={text.content} />
                ))
            }
        </ul>
    }

    return <>
        <section className={className}>
            {hasHeading && renderHeading(heading)}
            {hasContent && renderContent(content)}
        </section>
    </>
}