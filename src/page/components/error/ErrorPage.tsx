import "@/styles/ErrorPage.css";
import clippy from "/Clippy.png?url";

interface ErrorPageProps {
  error: Error;
  title?: string;
}

export function ErrorPage({
  error,
  title = "Error",
}: ErrorPageProps) {
  return (
    <div className="error-message-overlay">
      <div className="error-message-container">
        <div className="error-message-title">{title}</div>
        <div className="error-message-text">{error.message}</div>
      </div>
      <img src={clippy} alt="Clippy" className="clippy-image" />
    </div>
  );
}
