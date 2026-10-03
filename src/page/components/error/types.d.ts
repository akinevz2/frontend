export interface ErrorBoundaryProps {
  children: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export type ErrorMessageProps = {
  error: Error;
  title?: string;
  onRetry?: () => void;
};
