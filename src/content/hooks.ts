import { useState, useEffect } from 'react'
import { resolveOwn } from '.';

type ContentState =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'ready'; markdown: string }
    | { status: 'error'; error: Error }

export function useFetchDocument(url: string | undefined): ContentState {
    const sanitised: URL = resolveOwn(url);
    const [state, setState] = useState<ContentState>({ status: 'idle' })

    useEffect(() => {
        setState({ status: 'loading' })

        const controller = new AbortController()
        fetch(sanitised, { signal: controller.signal })
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