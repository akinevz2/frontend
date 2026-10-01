import { useEffect, useRef, useReducer, type FormEvent } from "react";
import { submitResumeInterest, trackResumeEvent } from "../lib/resumeAnalytics";

/** Resume modal and user interest state managed via reducer. */
type ResumeAccessMode = "html" | "pdf";

export interface ResumeState {
  showResumeModal: boolean;
  showEmailModal: boolean;
  interestEmail: string;
  interestMessage: string;
  isSubmittingInterest: boolean;
  printShortcutStep: number;
  resumeAccessMode: ResumeAccessMode | null;
}

export interface UseResumeOptions {
  resumeAccessMode: ResumeAccessMode | null;
}

export const initialResumeState: ResumeState = {
  showResumeModal: false,
  showEmailModal: false,
  interestEmail: "",
  interestMessage: "",
  isSubmittingInterest: false,
  printShortcutStep: 0,
  resumeAccessMode: null,
};

export type ResumeAction =
  | { type: "SET_SHOW_RESUME_MODAL"; value: boolean }
  | { type: "SET_SHOW_EMAIL_MODAL"; value: boolean }
  | { type: "SET_INTEREST_EMAIL"; value: string }
  | { type: "SET_INTEREST_MESSAGE"; value: string }
  | { type: "SET_IS_SUBMITTING_INTEREST"; value: boolean }
  | { type: "SET_PRINT_SHORTCUT_STEP"; value: number }
  | { type: "SET_RESUME_ACCESS_MODE"; value: ResumeAccessMode | null };

export function resumeReducer(
  state: ResumeState,
  action: ResumeAction,
): ResumeState {
  switch (action.type) {
    case "SET_SHOW_RESUME_MODAL":
      return { ...state, showResumeModal: action.value };
    case "SET_SHOW_EMAIL_MODAL":
      return { ...state, showEmailModal: action.value };
    case "SET_INTEREST_EMAIL":
      return { ...state, interestEmail: action.value };
    case "SET_INTEREST_MESSAGE":
      return { ...state, interestMessage: action.value };
    case "SET_IS_SUBMITTING_INTEREST":
      return { ...state, isSubmittingInterest: action.value };
    case "SET_PRINT_SHORTCUT_STEP":
      return { ...state, printShortcutStep: action.value };
    case "SET_RESUME_ACCESS_MODE":
      return { ...state, resumeAccessMode: action.value };
    default: {
      const _exhaustive: never = action;
      void _exhaustive;
      return state;
    }
  }
}

const ResumePage = () => {
  const RESUME_ACCESS_MODE_KEY = "resumeAccessMode";
  const resumeIframeRef = useRef<HTMLIFrameElement | null>(null);

  const [state, dispatch] = useReducer(resumeReducer, {
    ...initialResumeState,
    resumeAccessMode: (() => {
      const persistedMode = window.localStorage.getItem(RESUME_ACCESS_MODE_KEY);
      return persistedMode === "html" || persistedMode === "pdf"
        ? persistedMode
        : null;
    })(),
  });
  const resumeDocumentPath =
    state.resumeAccessMode === "pdf" ? "/documents/resume.pdf" : "/resume.html";
  const hasResolvedInterestSubmission = state.resumeAccessMode !== null;
  const shouldBlurResume = !hasResolvedInterestSubmission;

  useEffect(() => {
    void trackResumeEvent("resume_page_view");
  }, []);

  useEffect(() => {
    if (!state.showResumeModal) {
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

      if (state.printShortcutStep === 0) {
        const iframeWindow = resumeIframeRef.current?.contentWindow;
        if (iframeWindow) {
          iframeWindow.focus();
          iframeWindow.print();
        }
        dispatch({ type: "SET_PRINT_SHORTCUT_STEP", value: 1 });
        return;
      }

      window.location.assign(resumeDocumentPath);
    };

    window.addEventListener("keydown", handlePrintShortcut, true);
    return () => {
      window.removeEventListener("keydown", handlePrintShortcut, true);
    };
  }, [state.printShortcutStep, resumeDocumentPath, state.showResumeModal]);

  const handleInterestSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedEmail = state.interestEmail.trim();

    if (!trimmedEmail) {
      dispatch({
        type: "SET_INTEREST_MESSAGE",
        value: "Please provide an email address.",
      });
      return;
    }

    dispatch({ type: "SET_IS_SUBMITTING_INTEREST", value: true });
    dispatch({ type: "SET_INTEREST_MESSAGE", value: "" });

    try {
      await submitResumeInterest(trimmedEmail);
      dispatch({
        type: "SET_INTEREST_MESSAGE",
        value: "Thanks. Your interest has been recorded.",
      });
      dispatch({ type: "SET_INTEREST_EMAIL", value: "" });
      dispatch({ type: "SET_RESUME_ACCESS_MODE", value: "html" });
      dispatch({ type: "SET_SHOW_EMAIL_MODAL", value: false });
      window.localStorage.setItem(RESUME_ACCESS_MODE_KEY, "html");
    } catch {
      dispatch({
        type: "SET_INTEREST_MESSAGE",
        value: "Could not submit interest right now. Please try again shortly.",
      });
    } finally {
      dispatch({ type: "SET_IS_SUBMITTING_INTEREST", value: false });
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
                dispatch({ type: "SET_PRINT_SHORTCUT_STEP", value: 0 });
                dispatch({ type: "SET_SHOW_RESUME_MODAL", value: true });
              }}
            >
              View My Resume
            </button>
            <button
              onClick={() =>
                dispatch({ type: "SET_SHOW_EMAIL_MODAL", value: true })
              }
            >
              Share Interest Email
            </button>
          </div>
        </div>
      </section>

      {state.showResumeModal ? (
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
              dispatch({ type: "SET_SHOW_RESUME_MODAL", value: false });
            }
          }}
        >
          <div
            className="window"
            style={{ width: "90vw", height: "90vh", maxWidth: "1200px" }}
          >
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
                onClick={() =>
                  dispatch({ type: "SET_SHOW_RESUME_MODAL", value: false })
                }
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
                <button
                  onClick={() =>
                    dispatch({ type: "SET_SHOW_EMAIL_MODAL", value: true })
                  }
                >
                  Share Interest Email
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {state.showEmailModal ? (
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
