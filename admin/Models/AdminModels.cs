namespace Admin.Models;

/// <summary>
/// Configuration for a single OAuth provider (SoundCloud or Google).
/// Loaded from appsettings.json under "SoundCloud" or "Google" sections.
/// </summary>
public sealed class OAuthProviderConfig
{
    public string ClientId { get; set; } = string.Empty;
    public string ClientSecret { get; set; } = string.Empty;
    public string RedirectUri { get; set; } = string.Empty;
}

/// <summary>
/// Top-level appsettings section binding for the Admin service.
/// </summary>
public sealed class AdminOptions
{
    public List<string> AllowedOrigins { get; set; } = new();
    public string SiteOrigin { get; set; } = "https://akinevz.com";
    public OAuthProviderConfig SoundCloud { get; set; } = new();
    public OAuthProviderConfig Google { get; set; } = new();
    public string DataDir { get; set; } = "./data";

    /// <summary>
    /// WebAuthn relying-party identity. RpId is the registrable domain the
    /// browser sees (e.g. "ws-vision.tailac72a7.ts.net"); Origin is the full
    /// origin URL including port (e.g. "https://ws-vision.tailac72a7.ts.net:8443").
    /// Defaults assume direct access via the bare Tailscale short name.
    /// </summary>
    public string RpId { get; set; } = "ws-vision";
    public string RpName { get; set; } = "Admin Panel";
    public string Origin { get; set; } = "https://ws-vision:8443";

    /// <summary>
    /// When true, the app runs plain HTTP behind a TLS-terminating reverse
    /// proxy (e.g. `tailscale serve`). Skips self-signed cert generation,
    /// listens on HttpPort only, and trusts X-Forwarded-* headers.
    /// </summary>
    public bool BehindProxy { get; set; } = false;

    /// <summary>HTTP listen port when BehindProxy is true (default 8080).</summary>
    public int HttpPort { get; set; } = 8080;

    /// <summary>
    /// When non-empty, requests whose Host header equals this short name
    /// (e.g. "ws-vision" or "ws-vision:8443") get special handling: only
    /// /login is redirected (302) to LoginRedirectTarget, everything else
    /// returns 404 so stray scanners never discover the real FQDN.
    /// Empty disables the short-host gate (all hosts serve normally).
    /// </summary>
    public string ShortHost { get; set; } = "";
    public string LoginRedirectTarget { get; set; } = "";

    /// <summary>
    /// List of SoundCloud user IDs or Google subject IDs that are allowed to
    /// access the admin panel.  If empty, any authenticated user from either
    /// provider is permitted (useful for single-user setups).
    /// </summary>
    public List<string> AdminUsers { get; set; } = new();

    /// <summary>
    /// Whether to enable HTTPS with a self-signed certificate.  The cert is
    /// auto-generated on first start and persisted to {DataDir}/certs/admin.pfx.
    /// Default: true.
    /// </summary>
    public bool UseHttps { get; set; } = true;

    /// <summary>
    /// Hostnames and IPs to include as Subject Alternative Names (SANs) in the
    /// self-signed certificate.  Should match the names devices use to reach
    /// the server (e.g. Tailscale hostname, Tailscale IP).
    /// </summary>
    public List<string> CertSubjectNames { get; set; } = new()
    {
        "ws-vision",
    };
}

/// <summary>
/// Session record stored in-memory (and optionally persisted to JSON).
/// </summary>
public sealed class Session
{
    public string Id { get; set; } = string.Empty;
    public string Provider { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public string? AccessToken { get; set; }
    public string? RefreshToken { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

/// <summary>
/// A saved hyperlink on the landing page.
/// </summary>
public sealed class LinkItem
{
    public string Id { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int SortOrder { get; set; }
}

public sealed class LandingPageData
{
    public List<LinkItem> Links { get; set; } = new();
    public string Heading { get; set; } = "Frequently Visited";
    public string Subheading { get; set; } = "Quick links to everywhere I go";
}

/// <summary>
/// Recursive section structure mirroring the public site's sections.json schema.
/// Content can be a string, an array of strings/sections, or null.
/// Used by the landing page viewer in the admin panel.
/// </summary>
public sealed class SectionContent
{
    public string? Heading { get; set; }
    public string? Link { get; set; }
    public string? Theme { get; set; }
    public string? ClassName { get; set; }
    public object? Content { get; set; } // string | List<string|SectionContent> | null
}