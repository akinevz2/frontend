import { useEffect, useState, type ReactElement } from "react";

// ── Types ─────────────────────────────────────────────────────────────

interface UserInfo {
    provider: string;
    displayName: string;
    avatarUrl: string | null;
    userId: string;
}

interface LinkItem {
    id: string;
    label: string;
    url: string;
    description?: string;
    sortOrder: number;
}

interface LandingData {
    links: LinkItem[];
    heading: string;
    subheading: string;
}

// ── API helpers ───────────────────────────────────────────────────────

async function api<T>(
    path: string,
    options?: RequestInit,
): Promise<T> {
    const resp = await fetch(path, {
        credentials: "include",
        headers: { "Content-Type": "application/json", ...options?.headers },
        ...options,
    });
    if (!resp.ok) {
        const text = await resp.text().catch(() => resp.statusText);
        throw new Error(`${resp.status}: ${text}`);
    }
    return resp.json() as Promise<T>;
}

// ── Login Page ────────────────────────────────────────────────────────

function LoginPage() {
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get("error");

    return (
        <div className="window" style={{ maxWidth: "460px", margin: "2rem auto" }}>
            <div className="title-bar">
                <div className="title-bar-text">Admin Login</div>
            </div>
            <div className="window-body" style={{ padding: "1.5rem" }}>
                <p style={{ marginBottom: "1.5rem" }}>
                    Sign in to access the admin control panel. Use one of the providers below.
                </p>

                {oauthError && (
                    <div className="error-msg">
                        {oauthError}
                    </div>
                )}

                <a href="/auth/soundcloud" className="login-btn" style={{ textDecoration: "none", background: "#ff5500", color: "#fff" }}>
                    <span>🎵</span> Sign in with SoundCloud
                </a>

                <a href="/auth/google" className="login-btn" style={{ textDecoration: "none", background: "#4285f4", color: "#fff" }}>
                    <span>G</span> Sign in with Google
                </a>

                <p style={{ fontSize: "0.75rem", marginTop: "1.5rem", opacity: 0.6 }}>
                    Authentication is handled via OAuth 2.1 with PKCE. Your password is never sent to this server.
                </p>
            </div>
        </div>
    );
}

// ── Landing Page (configurable hyperlinks) ────────────────────────────

function LandingPage() {
    const [data, setData] = useState<LandingData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const d = await api<LandingData>("/api/landing");
                if (!cancelled) setData(d);
            } catch (e) {
                if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const updateField = (field: keyof LandingData, value: string) => {
        setData(prev => prev ? { ...prev, [field]: value } : prev);
    };

    const updateLink = (id: string, field: keyof LinkItem, value: string | number) => {
        setData(prev => prev ? {
            ...prev,
            links: prev.links.map(l =>
                l.id === id ? { ...l, [field]: value } : l
            ),
        } : prev);
    };

    const addLink = () => {
        setData(prev => prev ? {
            ...prev,
            links: [...prev.links, {
                id: crypto.randomUUID(),
                label: "",
                url: "",
                description: "",
                sortOrder: prev.links.length,
            }],
        } : prev);
    };

    const removeLink = (id: string) => {
        setData(prev => prev ? {
            ...prev,
            links: prev.links.filter(l => l.id !== id),
        } : prev);
    };

    const save = async () => {
        if (!data) return;
        setSaving(true);
        setError(null);
        try {
            await api("/api/landing", {
                method: "PUT",
                body: JSON.stringify(data),
            });
        } catch (e) {
            setError(e instanceof Error ? e.message : "Save failed");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <p>Loading...</p>;
    if (!data) return <p>No data</p>;

    return (
        <div className="window">
            <div className="title-bar">
                <div className="title-bar-text">Landing Page Configuration</div>
            </div>
            <div className="window-body" style={{ padding: "1rem" }}>
                {error && <div className="error-msg">{error}</div>}

                <fieldset style={{ marginBottom: "1rem" }}>
                    <legend>Header</legend>
                    <label style={{ display: "block", marginBottom: "0.5rem" }}>
                        Heading:<br />
                        <input
                            type="text"
                            value={data.heading}
                            onChange={e => updateField("heading", e.target.value)}
                            style={{ width: "100%" }}
                        />
                    </label>
                    <label style={{ display: "block" }}>
                        Subheading:<br />
                        <input
                            type="text"
                            value={data.subheading}
                            onChange={e => updateField("subheading", e.target.value)}
                            style={{ width: "100%" }}
                        />
                    </label>
                </fieldset>

                <fieldset style={{ marginBottom: "1rem" }}>
                    <legend>Hyperlinks ({data.links.length})</legend>
                    {data.links.map((link) => (
                        <div key={link.id} className="link-row">
                            <div style={{ flex: 1, display: "grid", gap: "0.25rem" }}>
                                <input
                                    type="text"
                                    placeholder="Label"
                                    value={link.label}
                                    onChange={e => updateLink(link.id, "label", e.target.value)}
                                />
                                <input
                                    type="url"
                                    placeholder="https://..."
                                    value={link.url}
                                    onChange={e => updateLink(link.id, "url", e.target.value)}
                                />
                                <input
                                    type="text"
                                    placeholder="Description (optional)"
                                    value={link.description ?? ""}
                                    onChange={e => updateLink(link.id, "description", e.target.value)}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => removeLink(link.id)}
                                title="Remove"
                                style={{ flexShrink: 0 }}
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                    <button type="button" onClick={addLink} style={{ marginTop: "0.5rem" }}>
                        + Add Link
                    </button>
                </fieldset>

                <button type="button" onClick={save} disabled={saving}>
                    {saving ? "Saving..." : "💾 Save"}
                </button>
            </div>
        </div>
    );
}

// ── SoundCloud Profile Explorer ───────────────────────────────────────

function SoundCloudPage() {
    const [sections, setSections] = useState<Record<string, unknown>>({});
    const [loading, setLoading] = useState<string | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const endpoints: { label: string; path: string }[] = [
        { label: "Profile", path: "" },
        { label: "Tracks", path: "/tracks" },
        { label: "Playlists", path: "/playlists" },
        { label: "Liked Tracks", path: "/likes/tracks" },
        { label: "Liked Playlists", path: "/likes/playlists" },
        { label: "Followers", path: "/followers" },
        { label: "Followings", path: "/followings" },
        { label: "Web Profiles", path: "/web-profiles" },
        { label: "Recently Played", path: "/recently-played/tracks" },
        { label: "Reposts (Tracks)", path: "/reposts/tracks" },
        { label: "Reposts (Playlists)", path: "/reposts/playlists" },
        { label: "Feed", path: "/feed" },
    ];

    const fetchSection = async (label: string, path: string) => {
        setLoading(label);
        setErrors(prev => ({ ...prev, [label]: "" }));
        try {
            const data = await api<unknown>(
                `/api/soundcloud/me${path}?linked_partitioning=true&limit=25`,
            );
            setSections(prev => ({ ...prev, [label]: data }));
        } catch (e) {
            setErrors(prev => ({
                ...prev,
                [label]: e instanceof Error ? e.message : "Fetch failed",
            }));
        } finally {
            setLoading(null);
        }
    };

    const renderValue = (value: unknown): ReactElement => {
        if (value === null) return <em>null</em>;
        if (typeof value === "string") return <span>"{value}"</span>;
        if (typeof value === "number") return <span>{String(value)}</span>;
        if (typeof value === "boolean") return <span>{String(value)}</span>;
        if (Array.isArray(value)) {
            return (
                <details>
                    <summary>Array[{value.length}]</summary>
                    <div style={{ paddingLeft: "1rem" }}>
                        {value.map((item, i) => (
                            <div key={i} style={{ marginBottom: "0.25rem" }}>
                                <strong>[{i}]</strong> {renderValue(item)}
                            </div>
                        ))}
                    </div>
                </details>
            );
        }
        if (typeof value === "object") {
            const entries = Object.entries(value as Record<string, unknown>);
            return (
                <details>
                    <summary>Object[{entries.length}]</summary>
                    <div style={{ paddingLeft: "1rem" }}>
                        {entries.map(([k, v]) => (
                            <div key={k} style={{ marginBottom: "0.15rem" }}>
                                <strong>{k}:</strong> {renderValue(v)}
                            </div>
                        ))}
                    </div>
                </details>
            );
        }
        return <span>{String(value)}</span>;
    };

    return (
        <div className="window">
            <div className="title-bar">
                <div className="title-bar-text">SoundCloud Profile Explorer</div>
            </div>
            <div className="window-body" style={{ padding: "1rem" }}>
                <p style={{ fontSize: "0.85rem", marginBottom: "1rem" }}>
                    Click any section below to query your SoundCloud profile data via the API.
                    Data is fetched on-demand (not a dashboard) and displayed in expandable sections.
                </p>

                {endpoints.map(({ label, path }) => (
                    <details key={label} className="sc-section">
                        <summary onClick={e => { e.preventDefault(); void fetchSection(label, path); }}>
                            {label}
                            {loading === label ? " ⏳" : ""}
                        </summary>
                        {errors[label] ? (
                            <div className="error-msg">{errors[label]}</div>
                        ) : sections[label] ? (
                            <div className="sc-data">{renderValue(sections[label])}</div>
                        ) : (
                            <p style={{ fontSize: "0.8rem", color: "#888" }}>Click to load...</p>
                        )}
                    </details>
                ))}
            </div>
        </div>
    );
}

// ── Main App ──────────────────────────────────────────────────────────

export default function App() {
    const [user, setUser] = useState<UserInfo | null>(null);
    const [authChecked, setAuthChecked] = useState(false);
    const [page, setPage] = useState<"landing" | "soundcloud">("landing");

    useEffect(() => {
        fetch("/auth/me", { credentials: "include" })
            .then(r => r.ok ? r.json() : null)
            .then((d: UserInfo | null) => { setUser(d); })
            .catch(() => { })
            .finally(() => setAuthChecked(true));
    }, []);

    const logout = async () => {
        await fetch("/auth/logout", {
            method: "POST",
            credentials: "include",
        });
        setUser(null);
        window.location.href = "/login";
    };

    if (!authChecked) {
        return <p style={{ textAlign: "center", marginTop: "2rem" }}>Loading...</p>;
    }

    if (!user) {
        return <LoginPage />;
    }

    return (
        <>
            <div className="admin-header">
                <h1>Admin Control Panel</h1>
                <div className="user-info">
                    {user.avatarUrl && (
                        <img
                            src={user.avatarUrl}
                            alt=""
                            className="sc-avatar"
                            style={{ width: 32, height: 32 }}
                        />
                    )}
                    <span>{user.displayName}</span>
                    <button type="button" onClick={logout}>Logout</button>
                </div>
            </div>

            <div className="nav-tabs">
                <button
                    type="button"
                    className={page === "landing" ? "active" : ""}
                    onClick={() => setPage("landing")}
                >
                    Landing Page
                </button>
                {user.provider === "soundcloud" && (
                    <button
                        type="button"
                        className={page === "soundcloud" ? "active" : ""}
                        onClick={() => setPage("soundcloud")}
                    >
                        SoundCloud
                    </button>
                )}
            </div>

            {page === "landing" && <LandingPage />}
            {page === "soundcloud" && <SoundCloudPage />}
        </>
    );
}