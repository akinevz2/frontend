import { useEffect, useRef, useState, type FormEvent } from "react";
import { submitResumeInterest, trackResumeEvent } from "../lib/resumeAnalytics";

const ResumePage = () => {
  const RESUME_ACCESS_MODE_KEY = "resumeAccessMode";
  type ResumeAccessMode = "html" | "pdf";
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [interestEmail, setInterestEmail] = useState("");
  const [interestMessage, setInterestMessage] = useState("");
  const [isSubmittingInterest, setIsSubmittingInterest] = useState(false);
  const [printShortcutStep, setPrintShortcutStep] = useState(0);
  const [resumeAccessMode, setResumeAccessMode] =
    useState<ResumeAccessMode | null>(() => {
      const persistedMode = window.localStorage.getItem(RESUME_ACCESS_MODE_KEY);
      return persistedMode === "html" || persistedMode === "pdf"
        ? persistedMode
        : null;
    });
  const resumeIframeRef = useRef<HTMLIFrameElement | null>(null);

  const resumeDocumentPath =
    resumeAccessMode === "pdf" ? "/documents/resume.pdf" : "/resume.html";
  const hasResolvedInterestSubmission = resumeAccessMode !== null;
  const shouldBlurResume = !hasResolvedInterestSubmission;

  useEffect(() => {
    void trackResumeEvent("resume_page_view");
  }, []);

  useEffect(() => {
    if (!showResumeModal) {
      return;
    }

    const handlePrintShortcut = (event: KeyboardEvent) => {
      const isPrintShortcut =
        (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "p";

      if (!isPrintShortcut) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (printShortcutStep === 0) {
        const iframeWindow = resumeIframeRef.current?.contentWindow;
        if (iframeWindow) {
          iframeWindow.focus();
          iframeWindow.print();
        }
        setPrintShortcutStep(1);
        return;
      }

      window.location.assign(resumeDocumentPath);
    };

    window.addEventListener("keydown", handlePrintShortcut, true);
    return () => {
      window.removeEventListener("keydown", handlePrintShortcut, true);
    };
  }, [printShortcutStep, resumeDocumentPath, showResumeModal]);

  const handleInterestSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedEmail = interestEmail.trim();

    if (!trimmedEmail) {
      setInterestMessage("Please provide an email address.");
      return;
    }

    setIsSubmittingInterest(true);
    setInterestMessage("");

    try {
      await submitResumeInterest(trimmedEmail);
      setInterestMessage("Thanks. Your interest has been recorded.");
      setInterestEmail("");
      setResumeAccessMode("html");
      window.localStorage.setItem(RESUME_ACCESS_MODE_KEY, "html");
    } catch {
      setInterestMessage(
        "Could not submit interest right now. Please try again shortly.",
      );
    } finally {
      setIsSubmittingInterest(false);
    }
  };

  return (
    <main>
      <section className="page">
        <div className="window">
          <div className="title-bar">
            <div className="title-bar-text">Resume</div>
            <div className="title-bar-controls">
              <button aria-label="Minimize"></button>
              <button aria-label="Maximize"></button>
              <button aria-label="Close"></button>
            </div>
          </div>
          <div
            className="window-body"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              justifyContent: "center",
              alignItems: "center",
              padding: "2rem",
            }}
          >
            <button
              onClick={() => {
                void trackResumeEvent("resume_open_click");
                setPrintShortcutStep(0);
                setShowResumeModal(true);
              }}
            >
              View My Resume
            </button>
            <button onClick={() => setShowEmailModal(true)}>
              Share Interest Email
            </button>
          </div>
        </div>
      </section>

      {showResumeModal ? (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            zIndex: 9000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowResumeModal(false);
            }
          }}
        >
          <div
            className="window"
            style={{ width: "90vw", height: "90vh", maxWidth: "1200px" }}
          >
            <div className="title-bar">
              <div className="title-bar-text">
                <a
                  href="/documents/resume.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Resume
                </a>
              </div>
              <div className="title-bar-controls">
                <button
                  aria-label="Close"
                  onClick={() => setShowResumeModal(false)}
                ></button>
              </div>
            </div>
            <div
              className="window-body"
              style={{
                padding: 0,
                height: "calc(100% - 2rem)",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <iframe
                ref={resumeIframeRef}
                src={resumeDocumentPath}
                title="Resume"
                style={{
                  width: "100%",
                  height: "100%",
                  border: "none",
                  filter: shouldBlurResume ? "blur(7px)" : "none",
                  transition: "filter 180ms ease",
                }}
              />
              {shouldBlurResume ? (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.75rem",
                    background: "rgba(255, 255, 255, 0.2)",
                    backdropFilter: "blur(1px)",
                    padding: "1rem",
                    textAlign: "center",
                  }}
                >
                  <p style={{ margin: 0 }}>
                    Submit your interest email to unblur this preview.
                  </p>
                  <button onClick={() => setShowEmailModal(true)}>
                    Share Interest Email
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {showEmailModal ? (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            zIndex: 9000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowEmailModal(false);
            }
          }}
        >
          <div className="window" style={{ maxWidth: "400px", margin: "auto" }}>
            <div className="title-bar">
              <div className="title-bar-text">Resume Interest</div>
              <div className="title-bar-controls">
                <button
                  aria-label="Close"
                  onClick={() => setShowEmailModal(false)}
                ></button>
              </div>
            </div>
            <div className="window-body">
              <form
                onSubmit={handleInterestSubmit}
                style={{ display: "grid", gap: "0.5rem", margin: "0.5rem 0" }}
              >
                <label htmlFor="resume-interest-email">
                  Share your email if you are interested in this resume:
                </label>
                <input
                  id="resume-interest-email"
                  type="email"
                  value={interestEmail}
                  onChange={(event) => setInterestEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                />
                <button type="submit" disabled={isSubmittingInterest}>
                  {isSubmittingInterest ? "Submitting..." : "Submit Interest"}
                </button>
              </form>
              {interestMessage ? (
                <p style={{ margin: "0.5rem 0", fontSize: "0.9rem" }}>
                  {interestMessage}
                </p>
              ) : null}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginTop: "1rem",
                }}
              >
                <button
                  onClick={() => {
                    if (!hasResolvedInterestSubmission) {
                      setResumeAccessMode("pdf");
                      window.localStorage.setItem(
                        RESUME_ACCESS_MODE_KEY,
                        "pdf",
                      );
                    }
                    setShowEmailModal(false);
                  }}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
};

export default ResumePage;
