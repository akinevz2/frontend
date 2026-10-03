import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'  // optional but wise if content is user-facing
import { useContentMarkdown } from '../content'

type Props = { url: string } | { lines: string | string[] }

export const MarkdownContent = (props: Props) => {
    if ("url" in props) {
        const { url } = props
        const state = useContentMarkdown(url)

        if (state.status === 'idle' || state.status === 'loading')
            return <div className="loading" />

        if (state.status === 'error')
            return <div className="error">{state.error.message}</div>

        return (
            <ReactMarkdown
                rehypePlugins={[rehypeRaw, rehypeSanitize]}
            >
                {state.markdown}
            </ReactMarkdown>
        )
    }
    const { lines } = props
    return (
        <ReactMarkdown
            rehypePlugins={[rehypeRaw, rehypeSanitize]}
        >
            {Array.isArray(lines) ? lines.join("  \n") : lines}
        </ReactMarkdown>
    )
}