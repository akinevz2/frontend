import { useMemo, useState, type SubmitEvent } from "react";
import { PageContent } from "../components/Page";
import { processContent } from "../windowing/utils.ts";
import type { SectionProps } from "../windowing";
import characters from "../../characters.json";

const WowPage = () => {
    const [username, setUsername] = useState("");
    const [date, setDate] = useState("");
    const [message, setMessage] = useState<string>("");
    const [messageType, setMessageType] = useState<"error" | "success" | "">("");

    const today = useMemo(() => new Date().toISOString().split("T")[0], []);

    const { processed, metadata } = useMemo(
        () => processContent(characters as SectionProps),
        [],
    );

    const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!username.trim()) {
            setMessageType("error");
            setMessage("Please enter a username.");
            return;
        }

        if (!date) {
            setMessageType("error");
            setMessage("Please enter a date.");
            return;
        }

        if (username.trim().toLowerCase() !== "kine") {
            setMessageType("error");
            setMessage("Invalid username.");
            return;
        }

        if (date !== today) {
            setMessageType("error");
            setMessage("Incorrect date. Please enter today's date.");
            return;
        }

        setMessageType("success");
        setMessage("Date verified! Starting download...");

        window.setTimeout(() => {
            const link = document.createElement("a");
            link.href = "/RuegConfig.7z";
            link.download = "RuegConfig.7z";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setMessageType("success");
            setMessage("Download started successfully!");
        }, 500);
    };

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
                                value={username}
                                onChange={(event) => setUsername(event.target.value)}
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
                                value={date}
                                onChange={(event) => setDate(event.target.value)}
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

                        {message ? (
                            <p
                                style={{
                                    marginTop: "0.75rem",
                                    fontWeight: "bold",
                                    color: messageType === "error" ? "#c00" : "#080",
                                }}
                            >
                                {message}
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