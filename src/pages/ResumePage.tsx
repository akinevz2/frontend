import { useEffect, useState, type FormEvent } from "react";
import { submitResumeInterest, trackResumeEvent } from "@/lib/resumeInterest";

type Mode = "html" | "pdf";

const MODE_KEY = "resumeAccessMode";
const UNLOCK_KEY = "resumeInterestSubmitted";
const RATE_KEY = "resumeInterestLastSubmitAt";
const RATE_LIMIT_MS = 30_000;
const SOURCES: Record<Mode, string> = {
  html: "/resume.html",
  pdf: "/documents/resume.pdf",
};
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const readMode = (): Mode =>
  localStorage.getItem(MODE_KEY) === "pdf" ? "pdf" : "html";

export const ResumePage = () => {
  const [mode, setMode] = useState<Mode>(readMode);
  const [unlocked, setUnlocked] = useState(
    () => localStorage.getItem(UNLOCK_KEY) === "1",
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void trackResumeEvent("resume_page_view", { mode });
  }, [mode]);

  const changeMode = (next: Mode) => {
    localStorage.setItem(MODE_KEY, next);
    setMode(next);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const value = email.trim();
    if (!EMAIL_PATTERN.test(value))
      return setMessage("Please enter a valid email address.");
    const last = Number(localStorage.getItem(RATE_KEY) ?? 0);
    if (Date.now() - last < RATE_LIMIT_MS)
      return setMessage("Please wait a moment before submitting again.");

    setBusy(true);
    try {
      await submitResumeInterest(value);
      localStorage.setItem(RATE_KEY, String(Date.now()));
      localStorage.setItem(UNLOCK_KEY, "1");
      setUnlocked(true);
      setModalOpen(false);
      setMessage("");
      void trackResumeEvent("resume_interest_submit");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Submission failed.");
      void trackResumeEvent("resume_interest_submit_failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="window resume-window">
      <div className="title-bar">
        <div className="title-bar-text">Resume</div>
      </div>
      <div className="window-body">
        <div className="resume-controls">
          <button
            type="button"
            onClick={() => changeMode(mode === "html" ? "pdf" : "html")}
            aria-label="Toggle resume format"
          >
            View as {mode === "html" ? "PDF" : "HTML"}
          </button>
          <a
            href={SOURCES[mode]}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => void trackResumeEvent("resume_open_click", { mode })}
          >
            Open in new tab
          </a>
        </div>
        <iframe
          title="Resume preview"
          className={`resume-frame${unlocked ? "" : " resume-blurred"}`}
          src={SOURCES[mode]}
        />
        {!unlocked && (
          <p>
            Submit your interest email to unblur this preview.{" "}
            <button type="button" onClick={() => setModalOpen(true)}>
              Resume Interest
            </button>
          </p>
        )}
      </div>

      {modalOpen && (
        <div
          className="maximized-backdrop"
          role="presentation"
          onClick={() => setModalOpen(false)}
        >
          <form
            className="window resume-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Resume Interest"
            onClick={(e) => e.stopPropagation()}
            onSubmit={submit}
          >
            <div className="title-bar">
              <div className="title-bar-text">Resume Interest</div>
              <div className="title-bar-controls">
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setModalOpen(false)}
                />
              </div>
            </div>
            <div className="window-body">
              <div className="field-row-stacked">
                <label htmlFor="resume-email">Email</label>
                <input
                  id="resume-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              {message && (
                <p className="form-feedback" role="alert">
                  {message}
                </p>
              )}
              <button type="submit" disabled={busy}>
                {busy ? "Submitting…" : "Submit Interest"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
