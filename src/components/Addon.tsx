import { CopyToClipboardButton } from "./CopyToClipboardButton.tsx";
import type { Heading, SectionProps } from "./Section";

export type AddonContent = string | string[] | AddonProps[]

export type AddonProps = SectionProps & {
    status?: string;
    text?: string;
    link?: string;
    content: AddonContent;
}

function renderHeading(heading: Heading, props: AddonProps) {
    const { link } = props
    return <RenderLink link={link} text={heading} />
}

function renderContent(content: AddonContent, props: AddonProps) {
    if (typeof content === "string")
        return <ul><li key={0}>{content}</li>{renderAddon(props)}</ul>
    return <ul>
        {
            content.map((text, index) => (
                typeof text == "string" ?
                    <li key={index}>{text}</li> :
                    <Addon key={index} {...text} />
            ))
        }
    </ul>
}

function renderStatus(status: string) {
    return <li className="addon">
        status: <em>{status}</em>
    </li>
}

function RenderLink(props: { link?: string, text: string, }) {
    const { link, text } = props
    return <h1>
        <a href={link} target="_blank">
            {text}
        </a>
    </h1>
}

function renderAddon(props: AddonProps) {
    const { status, text, } = props
    return [
        status && renderStatus(status),
        text && <CopyToClipboardButton content={text} />,
    ]
}

export const AddonList = (props: AddonProps) => {
    const { heading, content, className, children } = props
    const hasHeading = !!heading
    const hasContent = !!content

    return <>
        <section className={className}>
            {hasHeading ? renderHeading(heading, props) : null}
            {hasContent ? renderContent(content, props) : null}
            {children}
        </section>
    </>
}

export const Addon = (props: AddonProps) => {
    const { heading, content, className, children } = props
    const hasHeading = !!heading
    const hasContent = !!content

    return <>
        <section className={className}>
            {hasHeading ? renderHeading(heading, props) : null}
            {hasContent ? renderContent(content, props) : null}
            {children}
        </section>
    </>
}