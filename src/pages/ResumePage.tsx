export const ResumePage = () => {
  return (
    <div className="window resume-window">
      <div className="title-bar">
        <div className="title-bar-text">Resume</div>
      </div>
      <div className="window-body">
        <div className="resume-controls">
          <button
            type="button"
            onClick={() =>
              window.open("/documents/formal/resume.pdf", "_blank", "noopener")
            }
            aria-label="Open formal resume in a new tab"
          >
            Open in new tab
          </button>
          <a
            href="/documents/resume.pdf"
            target="_blank"
            rel="noopener noreferrer"
          >
            View as PDF
          </a>
          <a href="/resume.html" target="_blank" rel="noopener noreferrer">
            View as HTML
          </a>
        </div>
        <iframe
          title="Resume preview"
          className="resume-frame"
          src="/resume.html"
        />
      </div>
    </div>
  );
};
