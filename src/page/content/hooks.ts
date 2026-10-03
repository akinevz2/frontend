import { useState, useEffect } from 'react'

type ContentState =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'ready'; markdown: string }
    | { status: 'error'; error: Error }

export function useContentMarkdown(url: string | undefined): ContentState {
    const [state, setState] = useState<ContentState>({ status: 'idle' })

    useEffect(() => {
        if (!url) return
        setState({ status: 'loading' })

        const controller = new AbortController()
        fetch(url, { signal: controller.signal })
            .then(r => {
                if (!r.ok) throw new Error(`${r.status} fetching ${url}`)
                return r.text()
            })
            .then(markdown => setState({ status: 'ready', markdown }))
            .catch(err => {
                if (err.name === 'AbortError') return
                setState({ status: 'error', error: err instanceof Error ? err : new Error(String(err)) })
            })

        return () => controller.abort()
    }, [url])

    return state
}