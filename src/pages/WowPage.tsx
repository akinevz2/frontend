import { useMemo, useState, type FormEvent } from "react";
import { addons, type Section } from "@/content";
import { useSignals } from "@/lib/signals";
import { buildWindows, PageWindows, Window, type WindowNode } from "@/window";

type Feedback = { kind: "error" | "success"; text: string } | null;

const normalise = (value: string) => value.trim().toLowerCase();

/** Top-level sections whose heading marks them form-gated: the
 * full-UI distribution packs never render as page windows — they live
 * INSIDE the download form, appearing only once it has been verified
 * (unlocked), so a plain visit never exposes them. */
const GATED_HEADING_PREFIX = "Full UI pack";

const sections = addons.content as unknown as Section[];

const packSections = sections.filter((item) =>
  item.heading?.startsWith(GATED_HEADING_PREFIX),
);

const content = sections.filter(
  (item) => !item.heading?.startsWith(GATED_HEADING_PREFIX),
);

/** The pack sections as window nodes, wrapped in a synthetic anchor so
 * their ids ("packs.0", ...) never collide with the page's top-level
 * tree ("0", "1", ...). */
const packNodes: WindowNode[] =
  buildWindows([
    { anchor: "packs", content: packSections },
  ])[0]?.children.flatMap((child) =>
    child.kind === "window" ? [child.node] : [],
  ) ?? [];

const localIsoDate = () => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

function DownloadForm({ packs }: { packs: WindowNode[] }) {
  // Cancelling is a command, not a router call — the shell owns the one
  // router-aware "app:navigate" handler.
  const { dispatch } = useSignals();
  const [username, setUsername] = useState("");
  const [date, setDate] = useState("");
  const [verified, setVerified] = useState(false);
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

    setVerified(true);
    setFeedback({
      kind: "success",
      text: "Date verified! Full UI packs unlocked below.",
    });
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
            <button type="submit">Verify</button>
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
        {verified && (
          <ul>
            {packs.map((node) => (
              <li key={node.id}>
                <Window node={node} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export const WowPage = () => (
  // The download form renders after the content windows as a
  // PageWindows child, so the verified pack windows mount inside it
  // with the window store in reach.
  <PageWindows content={content}>
    <DownloadForm packs={packNodes} />
  </PageWindows>
);
