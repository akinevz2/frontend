import { useState, useCallback } from "react";

export interface ErrorMessageProps {
  error: Error | null;
  onClose?: () => void;
}

export function ErrorMessage({ error, onClose }: ErrorMessageProps) {
  if (!error) return null;

  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
    }
  }, [onClose]);

  return (
    <div className="error-overlay">
      <div className="error-speech-bubble">
        <div className="error-speech-bubble-header">
          <span className="error-icon">⚠️</span>
          <span className="error-title">System Error</span>
          {onClose && (
            <button
              className="error-close-btn"
              onClick={handleClose}
              title="Close error message"
            >
              ✕
            </button>
          )}
        </div>
        <div className="error-speech-bubble-body">
          <p className="error-message">{error.message}</p>
          {error.stack && process.env.NODE_ENV === "development" && (
            <div className="error-stack">
              <details>
                <summary>Error details</summary>
                <pre>{error.stack}</pre>
              </details>
            </div>
          )}
        </div>
      </div>
      <img
        src="/Clippy.png"
        alt="Clippy Assistant"
        className="error-clippy"
      />
    </div>
  );
}