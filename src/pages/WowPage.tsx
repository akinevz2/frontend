import { useMemo, useReducer, useCallback, type SubmitEvent } from "react";
import { setTheme } from "lightdni-jssas-toggle";
import { PageContent } from "../components/Page";
import { processContent } from "../windowing/utils.ts";
import type { SectionProps } from "../windowing";
import { playLayeredAudio } from "../lib/audioOverlap";
import characters from "../../characters.json";

const LILAC_THEME = "theme-lilac";
const LILAC_COOKIE_KEY = "wow-username-theme";
const LILAC_THEME_DEFINITIONS = {
  [LILAC_THEME]: {
    className: LILAC_THEME,
  },
} as const;

const isLilacEasterEggUsername = (value: string): boolean => {
  const normalized = value.trim().toLowerCase();
  return normalized === "lg355";
};

interface WowState {
  username: string;
  date: string;
  message: string;
  messageType: "error" | "success" | "";
}

type WowAction =
  | { type: "SET_USERNAME"; username: string }
  | { type: "SET_DATE"; date: string }
  | { type: "SET_MESSAGE"; message: string }
  | { type: "SET_MESSAGE_TYPE"; messageType: "error" | "success" | "" }
  | { type: "CLEAR_MESSAGE" }
  | { type: "UNSET_USERNAME" };

function wowReducer(
  state: WowState,
  action: WowAction,
): WowState {
  switch (action.type) {
    case "SET_USERNAME":
      return { ...state, username: action.username };
    case "SET_DATE":
      return { ...state, date: action.date };
    case "SET_MESSAGE":
      return { ...state, message: action.message };
    case "SET_MESSAGE_TYPE":
      return { ...state, messageType: action.messageType };
    case "CLEAR_MESSAGE":
      return { ...state, message: "", messageType: "" };
    case "UNSET_USERNAME":
      return { ...state, username: "" };
    default: {
      const _exhaustive: never = action;
      void _exhaustive;
      return state;
    }
  }
}

const WowPage = () => {
  const [state, dispatch] = useReducer(wowReducer, {} as WowState);
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  const { processed, metadata } = useMemo(
    () => processContent(characters as SectionProps),
    [],
  );

  const handleSubmit = useCallback(
    (event: SubmitEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!state.username.trim()) {
        dispatch({ type: "SET_MESSAGE_TYPE", messageType: "error" });
        dispatch({ type: "SET_MESSAGE", message: "Please enter a username." });
        return;
      }

      if (!state.date) {
        dispatch({ type: "SET_MESSAGE_TYPE", messageType: "error" });
        dispatch({ type: "SET_MESSAGE", message: "Please enter a date." });
        return;
      }

      if (
        state.username.trim().toLowerCase() !== "kine" &&
        !isLilacEasterEggUsername(state.username)
      ) {
        dispatch({ type: "SET_MESSAGE_TYPE", messageType: "error" });
        dispatch({ type: "SET_MESSAGE", message: "Invalid username." });
        return;
      }

      if (state.date !== today) {
        dispatch({ type: "SET_MESSAGE_TYPE", messageType: "error" });
        dispatch({ type: "SET_MESSAGE", message: "Incorrect date. Please enter today's date." });
        return;
      }

      if (isLilacEasterEggUsername(state.username)) {
        // Permanent cookie: lilac title bars across the whole site.
        setTheme({
          themeName: LILAC_THEME,
          themes: LILAC_THEME_DEFINITIONS,
          previousClassNames: [LILAC_THEME],
          persistence: "cookie",
          persistKey: LILAC_COOKIE_KEY,
          cookieMaxAgeDays: 365 * 10,
          accessibility: { setColorScheme: false },
        });
        playLayeredAudio("/tada.wav");
        dispatch({ type: "SET_MESSAGE_TYPE", messageType: "success" });
        dispatch({ type: "SET_MESSAGE", message: "Easter egg unlocked! Lilac theme activated." });
        return;
      }

      dispatch({ type: "SET_MESSAGE_TYPE", messageType: "success" });
      dispatch({ type: "SET_MESSAGE", message: "Date verified! Starting download..." });

      window.setTimeout(() => {
        const link = document.createElement("a");
        link.href = "/dist.7z";
        link.download = "dist.7z";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        dispatch({ type: "SET_MESSAGE_TYPE", messageType: "success" });
        dispatch({ type: "SET_MESSAGE", message: "Download started successfully!" });
      }, 500);
    },
    [],
  );

  return (
    <main>
      <div style={{ maxWidth: "600px", margin: "2rem auto", padding: "1rem" }}>
        <div
          className="window"
          style={{ background: "#ece9d8", border: "2px outset #dfdfdf" }}
        >
          <div className="title-bar">
            <span className="title-bar-text">Rueg Configuration Download</span>
          </div>

          <div style={{ marginBottom: "1rem", lineHeight: 1.5 }}>
            <p>
              To download the World of Warcraft configuration files, please
              enter your <a href="/addons">username</a> and verify today's date.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "1rem" }}>
              <label
                htmlFor="usernameInput"
                style={{ display: "block", marginBottom: "0.5rem" }}
              >
                Username:
              </label>
              <input
                id="usernameInput"
                type="text"
                value={state.username}
                onChange={(event) => dispatch({ type: "SET_USERNAME", username: event.target.value })}
                placeholder="Enter username"
                required
                style={{
                  width: "300px",
                  padding: "0.5rem",
                  border: "2px inset #808080",
                }}
              />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label
                htmlFor="dateInput"
                style={{ display: "block", marginBottom: "0.5rem" }}
              >
                Enter today's date:
              </label>
              <input
                id="dateInput"
                type="date"
                value={state.date}
                onChange={(event) => dispatch({ type: "SET_DATE", date: event.target.value })}
                max={today}
                required
                style={{
                  width: "300px",
                  padding: "0.5rem",
                  border: "2px inset #808080",
                }}
              />
            </div>

            <button
              type="submit"
              style={{ padding: "0.5rem 1.5rem", marginRight: "0.5rem" }}
            >
              Verify & Download
            </button>
            <button
              type="button"
              style={{ padding: "0.5rem 1.5rem" }}
              onClick={() => {
                window.history.pushState({}, "", "/");
                window.dispatchEvent(new PopStateEvent("popstate"));
              }}
            >
              Cancel
            </button>

            {state.message ? (
              <p
                style={{
                  marginTop: "0.75rem",
                  fontWeight: "bold",
                  color: state.messageType === "error" ? "#c00" : "#080",
                }}
              >
                {state.message}
              </p>
            ) : null}
          </form>
        </div>
      </div>
      <PageContent sections={processed} pageMetadata={{ sections: metadata }} />
    </main>
  );
};

export default WowPage;