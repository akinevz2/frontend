import "./ErrorMessage.css";

interface ErrorMessageProps {
  error: Error;
  title?: string;
  onRetry?: () => void;
}

export function ErrorMessage({
  error,
  title = "Error",
  onRetry,
}: ErrorMessageProps) {
  return (
    <div className="error-message-overlay">
      <div className="error-message-container">
        <div className="error-message-title">{title}</div>
        <div className="error-message-text">{error.message}</div>
        {onRetry && (
          <button className="error-message-retry" onClick={onRetry}>
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}
