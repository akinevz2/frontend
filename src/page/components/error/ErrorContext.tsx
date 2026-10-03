// ErrorContext.tsx
import { createContext, useContext, useState, type FC, type ReactNode } from 'react'

type ErrorCtx = {
    error: Error | null
    raise: (err: unknown) => void
    clear: () => void
}

const ErrorContext = createContext<ErrorCtx | null>(null)

export const ErrorProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const [error, setError] = useState<Error | null>(null)

    const raise = (err: unknown) =>
        setError(err instanceof Error ? err : new Error(String(err)))

    return (
        <ErrorContext.Provider value={{ error, raise, clear: () => setError(null) }}>
            {children}
        </ErrorContext.Provider>
    )
}

export const useError = (): ErrorCtx => {
    const ctx = useContext(ErrorContext)
    if (!ctx) throw new Error('useError used outside ErrorProvider')
    return ctx
}