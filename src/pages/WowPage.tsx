import { useMemo, useState, type FormEvent } from "react";
import { addons, characters } from "@/content";
import { useSignals } from "@/lib/signals";
import { PageWindows } from "@/window";

type Feedback = { kind: "error" | "success"; text: string } | null;

const normalise = (value: string) => value.trim().toLowerCase();
const localIsoDate = () => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

function download(href: string, name: string) {
  const link = document.createElement("a");
  link.href = href;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function DownloadForm() {
  // Cancelling is a command, not a router call — the shell owns the one
  // router-aware "app:navigate" handler.
  const { dispatch } = useSignals();
  const [username, setUsername] = useState("");
  const [date, setDate] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const today = useMemo(localIsoDate, []);

  const fail = (text: string) => setFeedback({ kind: "error", text });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const user = normalise(username);
    if (!user) return fail("Please enter a username.");
    if (!date) return fail("Please enter a date.");
    if (user !== "kine") return fail("Invalid username.");
    if (date !== today)
      return fail("Incorrect date. Please enter today's date.");

    setFeedback({
      kind: "success",
      text: "Date verified! Starting download...",
    });
    window.setTimeout(() => {
      download("/dist.7z", "dist.7z");
      setFeedback({ kind: "success", text: "Download started successfully!" });
    }, 500);
  };

  return (
    <div className="window download-window" id="download">
      <div className="title-bar">
        <span className="title-bar-text">WoW Profile Pack Download</span>
      </div>
      <div className="window-body">
        <p>
          To download the Rueg's UI configuration files — the Simple WoW UI Pack
          — please enter your <a href="/addons">username</a> and verify today's
          date.
        </p>
        <form onSubmit={onSubmit}>
          <div className="field-row-stacked">
            <label htmlFor="usernameInput">Username:</label>
            <input
              id="usernameInput"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
            />
          </div>
          <div className="field-row-stacked">
            <label htmlFor="dateInput">Enter today's date:</label>
            <input
              id="dateInput"
              type="date"
              value={date}
              max={today}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div className="form-actions">
            <button type="submit">Verify &amp; Download</button>
            <button
              type="button"
              onClick={() => dispatch("app:navigate", { to: "/" })}
            >
              Cancel
            </button>
          </div>
          {feedback && (
            <p className={`form-feedback ${feedback.kind}`} role="status">
              {feedback.text}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

export const WowPage = () => (
  <>
    <PageWindows content={[addons, characters]} />
    <DownloadForm />
  </>
);
