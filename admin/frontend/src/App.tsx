import { useEffect, useState, type ReactElement, type ReactNode } from "react";

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

interface SectionContent {
    heading?: string;
    link?: string;
    theme?: string | string[];
    className?: string;
    content?: string | (string | SectionContent)[] | null;
}

interface AllowedUserRow {
    userId: string;
    allowed: boolean;
    hasPasskey: boolean;
    deviceName: string | null;
    enrolledAt: string | null;
    lastUsedAt: string | null;
}

interface RegOptionsResp {
    challenge: string;
    rpId: string;
    rpName: string;
    userId: string;
    userName: string;
    userDisplayName: string;
    timeout: number;
}

interface AuthOptionsResp {
    challenge: string;
    rpId: string;
    timeout: number;
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

// ── WebAuthn base64url helpers ────────────────────────────────────────

function b64uToBuf(b64u: string): ArrayBuffer {
    const pad = b64u.length % 4 === 0 ? "" : "=".repeat(4 - (b64u.length % 4));
    const b64 = b64u.replace(/-/g, "+").replace(/_/g, "/") + pad;
    const bin = atob(b64);
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    return buf.buffer;
}

function bufToB64u(buf: ArrayBuffer | Uint8Array): string {
    const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i] ?? 0);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// ── Passkey enroll + login flows ──────────────────────────────────────

async function enrollPasskey(userId: string, deviceName: string): Promise<void> {
    const beginResp = await api<RegOptionsResp>(
        "/auth/passkey/enroll/begin",
        { method: "POST", body: JSON.stringify({ userId, deviceName }) },
    );

    const publicKey: PublicKeyCredentialCreationOptions = {
        challenge: b64uToBuf(beginResp.challenge),
        rp: { name: beginResp.rpName || "Admin Panel", id: beginResp.rpId },
        user: {
            id: b64uToBuf(beginResp.userId),
            name: beginResp.userName,
            displayName: beginResp.userDisplayName,
        },
        pubKeyCredParams: [
            { type: "public-key", alg: -7 },   // ES256
            { type: "public-key", alg: -257 },  // RS256
        ],
        authenticatorSelection: {
            residentKey: "required",
            userVerification: "preferred",
            authenticatorAttachment: "platform",
        },
        timeout: beginResp.timeout,
        attestation: "none",
    };

    const credential = await navigator.credentials.create({ publicKey }) as PublicKeyCredential | null;
    if (!credential) throw new Error("Passkey creation canceled");

    const raw = credential.response as AuthenticatorAttestationResponse;
    const body = {
        id: credential.id,
        rawId: bufToB64u(credential.rawId),
        type: credential.type,
        response: {
            attestationObject: bufToB64u(raw.attestationObject),
            clientDataJSON: bufToB64u(raw.clientDataJSON),
        },
        clientExtensionResults: {},
    };

    await api("/auth/passkey/enroll/complete", {
        method: "POST",
        body: JSON.stringify(body),
    });
}

async function loginWithPasskey(): Promise<void> {
    const beginResp = await api<AuthOptionsResp>(
        "/auth/passkey/login/begin",
        { method: "POST", body: JSON.stringify({}) },
    );

    const publicKey: PublicKeyCredentialRequestOptions = {
        challenge: b64uToBuf(beginResp.challenge),
        rpId: beginResp.rpId,
        userVerification: "preferred",
        timeout: beginResp.timeout,
    };

    const assertion = await navigator.credentials.get({ publicKey }) as PublicKeyCredential | null;
    if (!assertion) throw new Error("Passkey login canceled");

    const raw = assertion.response as AuthenticatorAssertionResponse;
    const body = {
        id: assertion.id,
        rawId: bufToB64u(assertion.rawId),
        type: assertion.type,
        response: {
            authenticatorData: bufToB64u(raw.authenticatorData),
            clientDataJSON: bufToB64u(raw.clientDataJSON),
            signature: bufToB64u(raw.signature),
            userHandle: raw.userHandle ? bufToB64u(raw.userHandle) : null,
        },
        clientExtensionResults: {},
    };

    await api("/auth/passkey/login/complete", {
        method: "POST",
        body: JSON.stringify(body),
    });
}

// ── Login Page ────────────────────────────────────────────────────────

function LoginPage({ onLoggedIn }: { onLoggedIn: () => void }) {
    const [mode, setMode] = useState<"login" | "enroll">("login");
    const [userId, setUserId] = useState("");
    const [deviceName, setDeviceName] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get("error");

    const doLogin = async () => {
        setBusy(true);
        setError(null);
        try {
            await loginWithPasskey();
            onLoggedIn();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Login failed");
        } finally {
            setBusy(false);
        }
    };

    const doEnroll = async () => {
        if (!userId.trim()) { setError("Enter a user ID"); return; }
        if (!deviceName.trim()) { setError("Enter a device name"); return; }
        setBusy(true);
        setError(null);
        try {
            await enrollPasskey(userId.trim(), deviceName.trim());
            onLoggedIn();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Enrollment failed");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="window" style={{ maxWidth: "460px", margin: "2rem auto" }}>
            <div className="title-bar">
                <div className="title-bar-text">Admin Login</div>
            </div>
            <div className="window-body" style={{ padding: "1.5rem" }}>
                {oauthError && <div className="error-msg">{oauthError}</div>}
                {error && <div className="error-msg">{error}</div>}

                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
                    <button
                        type="button"
                        className={mode === "login" ? "active" : ""}
                        onClick={() => { setMode("login"); setError(null); }}
                        style={{ flex: 1 }}
                    >
                        Sign in
                    </button>
                    <button
                        type="button"
                        className={mode === "enroll" ? "active" : ""}
                        onClick={() => { setMode("enroll"); setError(null); }}
                        style={{ flex: 1 }}
                    >
                        Enroll new device
                    </button>
                </div>

                {mode === "login" ? (
                    <>
                        <p style={{ marginBottom: "1rem" }}>
                            Sign in with a passkey enrolled on this device.
                        </p>
                        <button
                            type="button"
                            onClick={doLogin}
                            disabled={busy}
                            className="login-btn"
                            style={{ background: "#000", color: "#fff", textDecoration: "none" }}
                        >
                            {busy ? "..." : "🔓 Sign in with passkey"}
                        </button>
                    </>
                ) : (
                    <>
                        <p style={{ marginBottom: "1rem" }}>
                            Enter the user ID added to the allow-list, then enroll this device's passkey.
                        </p>
                        <label style={{ display: "block", marginBottom: "0.5rem" }}>
                            User ID:<br />
                            <input
                                type="text"
                                value={userId}
                                onChange={e => setUserId(e.target.value)}
                                style={{ width: "100%" }}
                                placeholder="e.g. kine-phone"
                                disabled={busy}
                            />
                        </label>
                        <label style={{ display: "block", marginBottom: "1rem" }}>
                            Device name:<br />
                            <input
                                type="text"
                                value={deviceName}
                                onChange={e => setDeviceName(e.target.value)}
                                style={{ width: "100%" }}
                                placeholder="e.g. Pixel 9"
                                disabled={busy}
                            />
                        </label>
                        <button
                            type="button"
                            onClick={doEnroll}
                            disabled={busy}
                            className="login-btn"
                            style={{ background: "#000", color: "#fff", textDecoration: "none" }}
                        >
                            {busy ? "..." : "🔑 Enroll passkey"}
                        </button>
                    </>
                )}

                <p style={{ fontSize: "0.75rem", marginTop: "1.5rem", opacity: 0.85 }}>
                    Passwordless WebAuthn. Each user ID holds exactly one passkey.
                </p>
            </div>
        </div>
    );
}

// ── Landing Page (section-based viewer) ──────────────────────────────

function renderMarkdownLinks(text: string): ReactNode {
    // Minimal [label](url) → <a> parser, matching the public site's behaviour.
    const parts: ReactNode[] = [];
    const re = /\[([^\]]*)\]\(([^)]+)\)/g;
    let last = 0;
    let m: RegExpExecArray | null;
    let i = 0;
    while ((m = re.exec(text)) !== null) {
        if (m.index > last) parts.push(text.slice(last, m.index));
        const label = m[1] ?? "";
        const url = m[2] ?? "";
        const isExternal = url.startsWith("http://") || url.startsWith("https://");
        parts.push(
            <a key={i++} href={url} target={isExternal ? "_blank" : undefined} rel={isExternal ? "noopener noreferrer" : undefined}>
                {label}
            </a>,
        );
        last = m.index + m[0].length;
    }
    if (last < text.length) parts.push(text.slice(last));
    return parts.length === 1 ? parts[0] : <>{parts}</>;
}

function renderContent(content: SectionContent["content"], depth: number): ReactNode {
    if (content == null) return null;
    if (typeof content === "string") {
        return <ul><li>{renderMarkdownLinks(content)}</li></ul>;
    }
    if (Array.isArray(content)) {
        // Group consecutive strings into single <li> blocks, recurse sections.
        const items: ReactNode[] = [];
        let buffer: string[] = [];
        let key = 0;
        const flush = () => {
            if (buffer.length > 0) {
                items.push(<li key={key++}>{renderMarkdownLinks(buffer.join("  \n"))}</li>);
                buffer = [];
            }
        };
        for (const item of content) {
            if (typeof item === "string") {
                buffer.push(item);
            } else {
                flush();
                items.push(<SectionRenderer key={key++} section={item} depth={depth + 1} />);
            }
        }
        flush();
        return <ul>{items}</ul>;
    }
    return null;
}

function SectionRenderer({ section, depth = 0 }: { section: SectionContent; depth?: number }) {
    const themes = Array.isArray(section.theme) ? section.theme : (section.theme ? [section.theme] : []);
    const dataTheme = themes.join(" ") || undefined;
    const className = `window ${section.className ?? ""}`.trim();
    const isValidLink = !!section.link && (section.link.startsWith("http://") || section.link.startsWith("https://") || section.link.startsWith("/"));

    return (
        <div className={className} data-theme={dataTheme} style={{ marginBottom: "0.75rem" }}>
            {section.heading && (
                <div className="title-bar">
                    <div className="title-bar-text">
                        {isValidLink && section.link ? (
                            <a href={section.link} target={section.link.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
                                {section.heading}
                            </a>
                        ) : section.heading}
                    </div>
                </div>
            )}
            <div className="window-body" style={{ padding: "0.5rem" }}>
                {renderContent(section.content, depth)}
            </div>
        </div>
    );
}

function LandingPage() {
    const [data, setData] = useState<SectionContent | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const d = await api<SectionContent>("/api/landing-sections");
                if (!cancelled) setData(d);
            } catch (e) {
                if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    if (loading) return <p>Loading...</p>;
    if (error) return <div className="error-msg">{error}</div>;
    if (!data) return <p>No content. Edit from the Tweaks tab.</p>;

    return <SectionRenderer section={data} />;
}

// ── Tweaks (link editor) ──────────────────────────────────────────────

function TweaksPage() {
    const [data, setData] = useState<LandingData | null>(null);
    const [sectionJson, setSectionJson] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savedMsg, setSavedMsg] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [d, s] = await Promise.all([
                    api<LandingData>("/api/landing"),
                    api<SectionContent>("/api/landing-sections"),
                ]);
                if (cancelled) return;
                setData(d);
                setSectionJson(JSON.stringify(s, null, 2));
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
        setSavedMsg(null);
        try {
            // Save flat links
            await api("/api/landing", {
                method: "PUT",
                body: JSON.stringify(data),
            });
            // Save section content (validate JSON first)
            let parsed: SectionContent;
            try { parsed = JSON.parse(sectionJson); }
            catch { throw new Error("Landing page JSON is invalid"); }
            await api("/api/landing-sections", {
                method: "PUT",
                body: JSON.stringify(parsed),
            });
            setSavedMsg("Saved ✓");
            setTimeout(() => setSavedMsg(null), 3000);
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
                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", alignItems: "center" }}>
                        <button type="button" onClick={addLink}>
                            + Add Link
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (!data) return;
                                try {
                                    const root: SectionContent = JSON.parse(sectionJson);
                                    root.heading = data.heading || root.heading;
                                    const existing = Array.isArray(root.content) ? root.content : [];
                                    if (data.subheading) {
                                        if (existing.length > 0 && typeof existing[0] === "string") {
                                            existing[0] = data.subheading;
                                        } else {
                                            existing.unshift(data.subheading);
                                        }
                                    }
                                    root.content = existing;
                                    const linkSections = data.links
                                        .filter(l => l.label && l.url)
                                        .map(l => ({
                                            heading: l.label,
                                            link: l.url,
                                            content: l.description || null,
                                        }));
                                    root.content = [...(root.content as (string|SectionContent)[]), ...linkSections];
                                    setSectionJson(JSON.stringify(root, null, 2));
                                } catch {
                                    setError("Cannot merge — landing page JSON is invalid");
                                }
                            }}
                            disabled={!data || data.links.length === 0}
                            title="Append the hyperlinks above as sections into the landing page JSON"
                        >
                            ↧ Push links to Landing Page
                        </button>
                    </div>
                </fieldset>

                <fieldset style={{ marginBottom: "1rem" }}>
                    <legend>Landing Page Content (JSON)</legend>
                    <p style={{ fontSize: "0.75rem", marginBottom: "0.5rem", opacity: 0.7 }}>
                        Section content rendered on the Landing Page tab. Schema: <code>{`{heading, link, theme, content: string | (string|object)[]}`}</code>
                    </p>
                    <textarea
                        value={sectionJson}
                        onChange={e => setSectionJson(e.target.value)}
                        disabled={saving}
                        spellCheck={false}
                        style={{
                            width: "100%", minHeight: "300px",
                            fontFamily: "monospace", fontSize: "0.8rem",
                            resize: "vertical",
                        }}
                    />
                </fieldset>

                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <button type="button" onClick={save} disabled={saving}>
                        {saving ? "Saving..." : "💾 Save"}
                    </button>
                    {savedMsg && <span style={{ color: "green" }}>{savedMsg}</span>}
                </div>
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

// ── Devices / Allowed Users Panel ─────────────────────────────────────

function DevicesPanel() {
    const [users, setUsers] = useState<AllowedUserRow[] | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const reload = async () => {
        try {
            const rows = await api<AllowedUserRow[]>("/auth/users");
            setUsers(rows);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load users");
        }
    };

    useEffect(() => { void reload(); }, []);

    const revoke = async (userId: string) => {
        if (!confirm(`Revoke "${userId}"? This deletes their passkey and logs them out. ` +
            `They cannot log back in until you re-add the ID to .allowed-users and rebuild.`))
            return;
        setBusy(userId);
        setError(null);
        try {
            await api(`/auth/users/${encodeURIComponent(userId)}/revoke`, { method: "POST" });
            await reload();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Revoke failed");
        } finally {
            setBusy(null);
        }
    };

    const restore = async (userId: string) => {
        setBusy(userId);
        setError(null);
        try {
            await api(`/auth/users/${encodeURIComponent(userId)}/restore`, { method: "POST" });
            await reload();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Restore failed");
        } finally {
            setBusy(null);
        }
    };

    if (users === null) return <p>Loading devices...</p>;

    return (
        <div className="window">
            <div className="title-bar">
                <div className="title-bar-text">Allowed Logins</div>
            </div>
            <div className="window-body" style={{ padding: "1rem" }}>
                {error && <div className="error-msg">{error}</div>}
                <p style={{ fontSize: "0.8rem", marginBottom: "1rem" }}>
                    User IDs come from <code>.allowed-users</code> (baked in at rebuild).
                    Revocation is in-memory until the next rebuild and also deletes the passkey.
                </p>
                {users.length === 0 ? (
                    <p>No user IDs in <code>.allowed-users</code>. Add one and rebuild to enroll a device.</p>
                ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
                                <th style={{ padding: "0.25rem" }}>User ID</th>
                                <th style={{ padding: "0.25rem" }}>Device</th>
                                <th style={{ padding: "0.25rem" }}>Status</th>
                                <th style={{ padding: "0.25rem" }}>Enrolled</th>
                                <th style={{ padding: "0.25rem" }}>Last used</th>
                                <th style={{ padding: "0.25rem" }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.userId} style={{ borderBottom: "1px solid #eee" }}>
                                    <td style={{ padding: "0.25rem" }}><code>{u.userId}</code></td>
                                    <td style={{ padding: "0.25rem" }}>{u.deviceName ?? <em>—</em>}</td>
                                    <td style={{ padding: "0.25rem" }}>
                                        {u.allowed
                                            ? (u.hasPasskey ? "✅ enrolled" : "⏳ awaiting enrollment")
                                            : "🚫 revoked"}
                                    </td>
                                    <td style={{ padding: "0.25rem", fontSize: "0.75rem" }}>
                                        {u.enrolledAt ? new Date(u.enrolledAt).toLocaleString() : "—"}
                                    </td>
                                    <td style={{ padding: "0.25rem", fontSize: "0.75rem" }}>
                                        {u.lastUsedAt ? new Date(u.lastUsedAt).toLocaleString() : "—"}
                                    </td>
                                    <td style={{ padding: "0.25rem" }}>
                                        {u.allowed ? (
                                            <button
                                                type="button"
                                                onClick={() => revoke(u.userId)}
                                                disabled={busy === u.userId}
                                            >
                                                {busy === u.userId ? "..." : "Revoke"}
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => restore(u.userId)}
                                                disabled={busy === u.userId}
                                            >
                                                {busy === u.userId ? "..." : "Restore"}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                <button type="button" onClick={reload} style={{ marginTop: "1rem" }}>↻ Refresh</button>
            </div>
        </div>
    );
}

// ── Main App ──────────────────────────────────────────────────────────

type Page = "landing" | "tweaks" | "devices" | "soundcloud";

export default function App() {
    const [user, setUser] = useState<UserInfo | null>(null);
    const [authChecked, setAuthChecked] = useState(false);
    const [page, setPage] = useState<Page>("landing");

    const checkAuth = () =>
        fetch("/auth/me", { credentials: "include" })
            .then(r => r.ok ? r.json() : null)
            .then((d: UserInfo | null) => { setUser(d); })
            .catch(() => { })
            .finally(() => setAuthChecked(true));

    useEffect(() => { void checkAuth(); }, []);

    const logout = async () => {
        await fetch("/auth/logout", { method: "POST", credentials: "include" });
        setUser(null);
        window.location.href = "/login";
    };

    if (!authChecked) {
        return <p style={{ textAlign: "center", marginTop: "2rem" }}>Loading...</p>;
    }

    if (!user) {
        return <LoginPage onLoggedIn={() => { window.location.href = "/landing"; }} />;
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
                <button
                    type="button"
                    className={page === "tweaks" ? "active" : ""}
                    onClick={() => setPage("tweaks")}
                >
                    Tweaks
                </button>
                <button
                    type="button"
                    className={page === "devices" ? "active" : ""}
                    onClick={() => setPage("devices")}
                >
                    Devices
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
            {page === "tweaks" && <TweaksPage />}
            {page === "devices" && <DevicesPanel />}
            {page === "soundcloud" && <SoundCloudPage />}
        </>
    );
}