// ErrorBoundary.tsx — has to be a class
import { Component, type ReactNode, type ErrorInfo } from 'react'
import { ErrorPage } from './ErrorPage'

interface Props {
  children: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info)
  }

  render() {
    if (this.state.error) {
      return <ErrorPage error={this.state.error} title="Error" />
    }
    return this.props.children
  }
}