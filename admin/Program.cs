using System.Web;
using System.Security.Claims;
using System.Security.Cryptography.X509Certificates;
using Microsoft.AspNetCore.HttpsPolicy;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.DataProtection;
using Admin.Models;
using Admin.Services;
using Fido2NetLib;
using Microsoft.AspNetCore.Http;

var builder = WebApplication.CreateBuilder(args);

// Bind options
builder.Services.Configure<AdminOptions>(builder.Configuration);
var opts = builder.Configuration.Get<AdminOptions>()
    ?? new AdminOptions();

// ── TLS setup ─────────────────────────────────────────────────────────
// Self-signed cert is only needed when the app terminates TLS itself.
// When BehindProxy is set, a reverse proxy (tailscale serve) handles TLS.
X509Certificate2? sslCert = null;
if (!opts.BehindProxy && opts.UseHttps)
{
    builder.Services.AddSingleton<CertManager>();
    var certManager = new CertManager(opts);
    sslCert = certManager.GetOrCreateCertificate(
        (opts.CertSubjectNames.Count > 0 ? opts.CertSubjectNames : new List<string> { "ws-vision" })
            .ToArray());
    Console.WriteLine($"[Admin] SSL cert path: {certManager.CertPath}");
    Console.WriteLine($"[Admin] SSL cert SANs: {string.Join(", ", opts.CertSubjectNames)}");
}

// ── Configure Kestrel ─────────────────────────────────────────────────
builder.WebHost.ConfigureKestrel(kestrel =>
{
    if (opts.BehindProxy)
    {
        // Plain HTTP only; TLS terminated by the reverse proxy.
        kestrel.ListenAnyIP(opts.HttpPort);
        // Dedicated redirect-only port (published to host 80). Only /login
        // 302s to the FQDN login page; everything else returns a dead 404.
        kestrel.ListenAnyIP(1337);
    }
    else if (opts.UseHttps)
    {
        kestrel.ListenAnyIP(8443, listen => listen.UseHttps(sslCert!));
        // HTTP listener — redirects to HTTPS
        kestrel.ListenAnyIP(8080);
    }
    else
    {
        // Fallback: HTTP only (dev mode or explicit disable)
        kestrel.ListenAnyIP(8443);
    }
});

// Register services (singletons - they hold in-memory state)
builder.Services.AddSingleton(opts);
builder.Services.AddSingleton<SessionStore>();
builder.Services.AddSingleton<OAuthService>();
builder.Services.AddSingleton<SoundCloudProxyService>();
builder.Services.AddSingleton<LandingPageStore>();
builder.Services.AddSingleton<LandingSectionStore>();
builder.Services.AddSingleton<PasskeyStore>(_ => new PasskeyStore(opts.DataDir));
builder.Services.AddSingleton<AllowedUserStore>(_ => new AllowedUserStore(opts.DataDir));

// ── Validate WebAuthn / TLS config at startup ────────────────────────
// Fail fast with a clear message instead of 500-ing on the first passkey
// request.  BehindProxy mode requires an https Origin and a non-empty RpId.
if (opts.BehindProxy)
{
    if (string.IsNullOrWhiteSpace(opts.RpId) || opts.RpId.Contains("://"))
        throw new InvalidOperationException($"RpId is invalid: '{opts.RpId}'. Expected a bare hostname (e.g. ws-vision.tailac72a7.ts.net).");
    if (string.IsNullOrWhiteSpace(opts.Origin) || !opts.Origin.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        throw new InvalidOperationException($"Origin must be https:// when BehindProxy is true. Got: '{opts.Origin}'.");
    if (string.IsNullOrWhiteSpace(opts.LoginRedirectTarget) || !opts.LoginRedirectTarget.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        throw new InvalidOperationException($"LoginRedirectTarget must be https:// when BehindProxy is true. Got: '{opts.LoginRedirectTarget}'.");
    Console.WriteLine($"[Admin] WebAuthn RP: {opts.RpId}  Origin: {opts.Origin}");
}
builder.Services.AddSingleton<PasskeyService>(sp =>
{
    var store = sp.GetRequiredService<PasskeyStore>();
    return new PasskeyService(store, opts.RpId, opts.RpName, opts.Origin);
});

// Cookie-based auth
builder.Services.AddCors();
// Persist DataProtection keys to {DataDir}/keys (inside the admin-data volume)
// so cookie auth tickets survive container restarts/rebuilds.
builder.Services.AddDataProtection()
    .PersistKeysToFileSystem(new DirectoryInfo(Path.Combine(opts.DataDir, "keys")));
builder.Services.AddAuthentication("Cookies")
    .AddCookie("Cookies", o =>
    {
        o.Cookie.Name = "admin_session";
        o.Cookie.HttpOnly = true;
        o.Cookie.SecurePolicy = CookieSecurePolicy.Always;
        o.Cookie.SameSite = SameSiteMode.Lax;
        o.LoginPath = "/auth/login";
        o.ExpireTimeSpan = TimeSpan.FromDays(7);
    });

// Dev bypass: allow login via /auth/dev-login?password=xxx when DevPassword is set
var devPassword = builder.Configuration["DevPassword"];
if (!string.IsNullOrEmpty(devPassword))
{
    builder.Services.AddAuthentication()
        .AddScheme<Microsoft.AspNetCore.Authentication.AuthenticationSchemeOptions, DevAuthHandler>("Dev", null);
}

builder.Services.AddAuthorization();
builder.Services.AddDistributedMemoryCache();
builder.Services.AddSession(o =>
{
    o.Cookie.HttpOnly = true;
    o.Cookie.SecurePolicy = CookieSecurePolicy.Always;
    o.Cookie.SameSite = SameSiteMode.Lax;
    o.IdleTimeout = TimeSpan.FromMinutes(10);
});

// HSTS in production (tells browser to always use HTTPS for this host)
if (!builder.Environment.IsDevelopment() && opts.UseHttps)
{
    builder.Services.Configure<HstsOptions>(o => o.MaxAge = TimeSpan.FromDays(365));
}

// HTTPS redirection port (since Kestrel listens on 8443 for HTTPS)
// Skipped when BehindProxy — the proxy terminates TLS.
if (!opts.BehindProxy && opts.UseHttps)
{
    builder.Services.Configure<HttpsRedirectionOptions>(o => o.HttpsPort = 8443);
}

var app = builder.Build();

// Trust X-Forwarded-* from the Tailscale reverse proxy so the app sees HTTPS,
// the real client IP, and the correct host even though Kestrel speaks HTTP.
if (opts.BehindProxy)
{
    app.UseForwardedHeaders(new ForwardedHeadersOptions
    {
        ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
                            | ForwardedHeaders.XForwardedHost,
    });
}

// ── Short-host gate ───────────────────────────────────────────────────
// Only /login on the bare short name (e.g. ws-vision) — OR on the dedicated
// redirect port 1337 (published to host 80) — redirects to the FQDN login
// page.  On the redirect port, anything else aborts the TCP connection so
// the port is indistinguishable from closed.  On the short host (port 8080)
// non-login paths return a bare 404 with no body/Server header.
// Disabled when ShortHost is empty.
if (!string.IsNullOrEmpty(opts.ShortHost))
{
    app.Use(async (ctx, next) =>
    {
        var host = ctx.Request.Host.Host ?? "";
        var isShortHost = string.Equals(host, opts.ShortHost, StringComparison.OrdinalIgnoreCase);
        var isRedirectPort = ctx.Connection.LocalPort == 1337;

        if (isShortHost || isRedirectPort)
        {
            if (ctx.Request.Path.StartsWithSegments("/login"))
            {
                ctx.Response.Redirect(opts.LoginRedirectTarget);
                return;
            }
            if (isRedirectPort)
            {
                // Truly dead port: drop the TCP connection without any HTTP response.
                ctx.Abort();
                return;
            }
            // Short host on 8080: bare 404, no Server header, empty body.
            ctx.Response.Headers.Server = "";
            ctx.Response.StatusCode = 404;
            ctx.Response.ContentLength = 0;
            await ctx.Response.Body.DisposeAsync();
            return;
        }
        await next();
    });
}

// Helper: establish an authenticated session (cookie auth scheme + SessionStore)
async Task EstablishSessionAsync(HttpContext ctx, SessionStore store, Session session)
{
    store.Create(session);
    var identity = new ClaimsIdentity(new[]
    {
        new Claim(ClaimTypes.NameIdentifier, session.UserId),
        new Claim("provider", session.Provider),
    }, "Cookies");
    await ctx.SignInAsync("Cookies", new ClaimsPrincipal(identity));
    // Separate cookie carrying the SessionStore id (for token lookup in proxy/me)
    ctx.Response.Cookies.Append("admin_sid", session.Id, new CookieOptions
    {
        HttpOnly = true,
        SameSite = SameSiteMode.Lax,
        MaxAge = TimeSpan.FromDays(7),
        Secure = opts.UseHttps,
    });
}

// Helper: read the SessionStore id from the admin_sid cookie
static Session? CurrentSession(HttpContext ctx, SessionStore store)
{
    var sid = ctx.Request.Cookies["admin_sid"];
    if (string.IsNullOrEmpty(sid)) return null;
    var s = store.Get(sid);
    return (s is null || !store.IsValid(sid)) ? null : s;
}

// CORS - allow the frontend SPA origin
app.UseCors(p => p
    .WithOrigins(opts.AllowedOrigins.ToArray())
    .AllowAnyMethod()
    .AllowAnyHeader()
    .AllowCredentials());


app.UseAuthentication();
app.UseAuthorization();
app.UseSession();

// Session cleanup every 10 minutes
_ = Task.Run(async () =>
{
    var store = app.Services.GetRequiredService<SessionStore>();
    using var timer = new PeriodicTimer(TimeSpan.FromMinutes(10));
    while (await timer.WaitForNextTickAsync())
        store.CleanupExpired();
});

// ── Health check ──────────────────────────────────────────────────────
app.MapGet("/status", () => TypedResults.Ok(new
{
    ok = true,
    service = "admin",
    timestamp = DateTimeOffset.UtcNow,
}));

// ── Auth: get current session info ────────────────────────────────────
app.MapGet("/auth/me", (HttpContext ctx, SessionStore store) =>
{
    var s = CurrentSession(ctx, store);
    if (s is null) return Results.Unauthorized();
    return Results.Ok(new
    {
        provider = s.Provider,
        displayName = s.DisplayName,
        avatarUrl = s.AvatarUrl,
        userId = s.UserId,
    });
}).RequireAuthorization();



// Dev login bypass
if (!string.IsNullOrEmpty(devPassword))
{
    app.MapGet("/auth/dev-login", async (HttpContext ctx, SessionStore store) =>
    {
        // Only allow dev-login when reached via a localhost Host header, so it
        // cannot be used from ws-vision / Tailscale / remote origins.
        var host = ctx.Request.Host.Host ?? "";
        var isLocal = host == "localhost" || host == "127.0.0.1" || host == "::1";
        if (!isLocal)
            return Results.Json(new { error = "Dev login is only available from localhost." }, statusCode: 403);

        var pwd = ctx.Request.Query["password"].ToString();
        if (pwd != devPassword)
            return Results.Unauthorized();

        var session = new Session
        {
            Id = PkceHelper.GenerateState(),
            Provider = "dev",
            UserId = "dev-user",
            DisplayName = "Dev User",
            AvatarUrl = null,
            AccessToken = null,
            RefreshToken = null,
            ExpiresAt = DateTimeOffset.UtcNow.AddDays(7),
            CreatedAt = DateTimeOffset.UtcNow,
        };
        await EstablishSessionAsync(ctx, store, session);
        return Results.Redirect("/landing");
    }).AllowAnonymous();
}

// ── Passkey: Registration options ─────────────────────────────────────
app.MapPost("/auth/passkey/register/begin", async (
    HttpContext ctx, PasskeyService passkey, SessionStore store) =>
{
    var session = CurrentSession(ctx, store);
    if (session is null) return Results.Unauthorized();

    var body = await ctx.Request.ReadFromJsonAsync<PasskeyRegisterRequest>();
    if (body is null || string.IsNullOrEmpty(body.DeviceName))
        return Results.BadRequest("Device name required");

    var (options, challenge) = await passkey.CreateRegistrationOptionsAsync(
        session.UserId, session.UserId, session.DisplayName);

    // Store challenge in session for verification
    ctx.Session.SetString("passkey_reg_challenge", challenge);
    ctx.Session.SetString("passkey_reg_device", body.DeviceName);

    return Results.Ok(options);
}).RequireAuthorization();

app.MapPost("/auth/passkey/register/complete", async (
    HttpContext ctx, PasskeyService passkey, SessionStore store) =>
{
    var session = CurrentSession(ctx, store);
    if (session is null) return Results.Unauthorized();

    var challenge = ctx.Session.GetString("passkey_reg_challenge");
    var deviceName = ctx.Session.GetString("passkey_reg_device");
    if (string.IsNullOrEmpty(challenge))
        return Results.BadRequest("No registration in progress");

    var response = await ctx.Request.ReadFromJsonAsync<AuthenticatorAttestationRawResponse>();
    if (response is null)
        return Results.BadRequest("Invalid response");

    var cred = await passkey.VerifyRegistrationAsync(
        session.UserId, session.UserId, session.DisplayName, deviceName ?? "",
        challenge, response);

    if (cred is null)
        return Results.BadRequest("Registration failed");

    ctx.Session.Remove("passkey_reg_challenge");
    ctx.Session.Remove("passkey_reg_device");

    return Results.Ok(new { success = true, credentialId = cred.Id });
}).RequireAuthorization();

// ── Passkey: Enrollment for a new device (no session required) ────────
// Gated by AllowedUserStore: the userId must be listed in .allowed-users
// and must not yet have an enrolled passkey (one passkey per user ID).
app.MapPost("/auth/passkey/enroll/begin", async (
    HttpContext ctx, PasskeyService passkey, PasskeyStore passkeyStore,
    AllowedUserStore allowed) =>
{
    var body = await ctx.Request.ReadFromJsonAsync<PasskeyEnrollRequest>();
    if (body is null || string.IsNullOrWhiteSpace(body.UserId))
        return Results.BadRequest("User ID required");
    if (string.IsNullOrWhiteSpace(body.DeviceName))
        return Results.BadRequest("Device name required");

    var userId = body.UserId.Trim();
    if (!allowed.IsAllowed(userId))
        return Results.Json(new { error = "User ID not allowed" }, statusCode: 403);

    var existing = await passkeyStore.GetCredentialsAsync(userId);
    if (existing.Count > 0)
        return Results.Json(new { error = "This user ID already has an enrolled passkey." }, statusCode: 409);

    var (options, challenge) = await passkey.CreateRegistrationOptionsAsync(
        userId, userId, body.DeviceName);

    ctx.Session.SetString("passkey_enroll_challenge", challenge);
    ctx.Session.SetString("passkey_enroll_user", userId);
    ctx.Session.SetString("passkey_enroll_device", body.DeviceName);

    return Results.Ok(options);
}).AllowAnonymous();

app.MapPost("/auth/passkey/enroll/complete", async (
    HttpContext ctx, PasskeyService passkey, PasskeyStore passkeyStore,
    AllowedUserStore allowed, SessionStore store) =>
{
    var challenge = ctx.Session.GetString("passkey_enroll_challenge");
    var userId = ctx.Session.GetString("passkey_enroll_user");
    var deviceName = ctx.Session.GetString("passkey_enroll_device");
    if (string.IsNullOrEmpty(challenge) || string.IsNullOrEmpty(userId))
        return Results.BadRequest("No enrollment in progress");

    if (!allowed.IsAllowed(userId))
        return Results.Json(new { error = "User ID not allowed" }, statusCode: 403);

    var existing = await passkeyStore.GetCredentialsAsync(userId);
    if (existing.Count > 0)
        return Results.Json(new { error = "This user ID already has an enrolled passkey." }, statusCode: 409);

    var response = await ctx.Request.ReadFromJsonAsync<AuthenticatorAttestationRawResponse>();
    if (response is null)
        return Results.BadRequest("Invalid response");

    var cred = await passkey.VerifyRegistrationAsync(
        userId, userId, deviceName ?? userId, deviceName ?? userId,
        challenge, response);
    if (cred is null)
        return Results.BadRequest("Enrollment failed");

    ctx.Session.Remove("passkey_enroll_challenge");
    ctx.Session.Remove("passkey_enroll_user");
    ctx.Session.Remove("passkey_enroll_device");

    // Auto-login the newly-enrolled device
    var session = new Session
    {
        Id = PkceHelper.GenerateState(),
        Provider = "passkey",
        UserId = userId,
        DisplayName = deviceName ?? userId,
        AvatarUrl = null,
        AccessToken = null,
        RefreshToken = null,
        ExpiresAt = DateTimeOffset.UtcNow.AddDays(7),
        CreatedAt = DateTimeOffset.UtcNow,
    };
    await EstablishSessionAsync(ctx, store, session);

    return Results.Ok(new { success = true, redirect = "/landing" });
}).AllowAnonymous();

// ── Passkey: Authentication options ───────────────────────────────────
app.MapPost("/auth/passkey/login/begin", async (
    HttpContext ctx, PasskeyService passkey) =>
{
    var (options, challenge) = await passkey.CreateAuthenticationOptionsAsync();

    ctx.Session.SetString("passkey_auth_challenge", challenge);

    return Results.Ok(options);
}).AllowAnonymous();

app.MapPost("/auth/passkey/login/complete", async (
    HttpContext ctx, PasskeyService passkey, SessionStore store) =>
{
    var challenge = ctx.Session.GetString("passkey_auth_challenge");
    if (string.IsNullOrEmpty(challenge))
        return Results.BadRequest("No authentication in progress");

    var response = await ctx.Request.ReadFromJsonAsync<AuthenticatorAssertionRawResponse>();
    if (response is null)
        return Results.BadRequest("Invalid response");

    var (success, userId, cred) = await passkey.VerifyAuthenticationAsync(challenge, response);
    if (!success || userId is null || cred is null)
        return Results.Unauthorized();

    // Create session for the user
    var session = new Session
    {
        Id = PkceHelper.GenerateState(),
        Provider = "passkey",
        UserId = userId,
        DisplayName = cred.DeviceName ?? "Passkey User",
        AvatarUrl = null,
        AccessToken = null,
        RefreshToken = null,
        ExpiresAt = DateTimeOffset.UtcNow.AddDays(7),
        CreatedAt = DateTimeOffset.UtcNow,
    };
    await EstablishSessionAsync(ctx, store, session);

    ctx.Session.Remove("passkey_auth_challenge");

    return Results.Ok(new { success = true, redirect = "/landing" });
}).AllowAnonymous();

// ── Passkey: List credentials ─────────────────────────────────────────
app.MapGet("/auth/passkey/credentials", async (
    HttpContext ctx, PasskeyStore passkeyStore, SessionStore store) =>
{
    var session = CurrentSession(ctx, store);
    if (session is null) return Results.Unauthorized();

    var creds = await passkeyStore.GetCredentialsAsync(session.UserId);
    return Results.Ok(creds.Select(c => new
    {
        id = c.Id,
        deviceName = c.DeviceName,
        createdAt = c.CreatedAt,
        lastUsedAt = c.LastUsedAt,
        transports = c.Transports
    }));
}).RequireAuthorization();

app.MapDelete("/auth/passkey/credentials/{credId}", async (
    HttpContext ctx, PasskeyStore passkeyStore, SessionStore store, string credId) =>
{
    var session = CurrentSession(ctx, store);
    if (session is null) return Results.Unauthorized();

    await passkeyStore.DeleteCredentialAsync(session.UserId, credId);
    return Results.Ok(new { success = true });
}).RequireAuthorization();

// ── Allowed users / devices panel (logged-in) ────────────────────────
// Lists every user ID from .allowed-users with their passkey enrollment
// status.  Revoking removes the user from the in-memory allow list AND
// deletes their passkey; the change survives until the next rebuild.
app.MapGet("/auth/users", async (
    HttpContext ctx, AllowedUserStore allowed, PasskeyStore passkeyStore, SessionStore store) =>
{
    var session = CurrentSession(ctx, store);
    if (session is null) return Results.Unauthorized();

    var rows = new List<AllowedUserInfo>();
    foreach (var userId in allowed.AllFileUsers)
    {
        var creds = await passkeyStore.GetCredentialsAsync(userId);
        var cred = creds.FirstOrDefault();
        rows.Add(new AllowedUserInfo
        {
            UserId = userId,
            Allowed = allowed.IsAllowed(userId),
            HasPasskey = cred is not null,
            DeviceName = cred?.DeviceName,
            EnrolledAt = cred?.CreatedAt,
            LastUsedAt = cred?.LastUsedAt,
        });
    }
    return Results.Ok(rows);
}).RequireAuthorization();

app.MapPost("/auth/users/{userId}/revoke", async (
    HttpContext ctx, string userId, AllowedUserStore allowed,
    PasskeyStore passkeyStore, SessionStore store) =>
{
    var session = CurrentSession(ctx, store);
    if (session is null) return Results.Unauthorized();

    if (!allowed.AllFileUsers.Contains(userId))
        return Results.NotFound("Unknown user ID");

    allowed.Revoke(userId);
    await passkeyStore.DeleteAllCredentialsAsync(userId);

    // If revoking self, log out
    if (session.UserId == userId)
        await ctx.SignOutAsync("Cookies");

    return Results.Ok(new { success = true });
}).RequireAuthorization();

app.MapPost("/auth/users/{userId}/restore", async (
    HttpContext ctx, string userId, AllowedUserStore allowed, SessionStore store) =>
{
    var session = CurrentSession(ctx, store);
    if (session is null) return Results.Unauthorized();

    allowed.Restore(userId);
    return Results.Ok(new { success = true });
}).RequireAuthorization();

// ── Auth: initiate SoundCloud login ──────────────────────────────────
app.MapGet("/auth/soundcloud", (SessionStore store, OAuthService oauth) =>
{
    var (verifier, challenge) = PkceHelper.Generate();
    var state = PkceHelper.GenerateState();
    store.StorePkceVerifier(state, verifier);
    var url = oauth.BuildSoundCloudAuthUrl(state, challenge);
    return Results.Redirect(url);
});

// ── Auth: SoundCloud callback ─────────────────────────────────────────
app.MapGet("/auth/soundcloud/callback", async (
    HttpContext ctx, SessionStore store, OAuthService oauth) =>
{
    var code = ctx.Request.Query["code"].ToString();
    var state = ctx.Request.Query["state"].ToString();
    var error = ctx.Request.Query["error"].ToString();

    if (!string.IsNullOrEmpty(error))
        return Results.Redirect($"/login?error={HttpUtility.UrlEncode(error)}");
    if (string.IsNullOrEmpty(code) || string.IsNullOrEmpty(state))
        return Results.BadRequest("Missing code or state");

    var verifier = store.ConsumePkceVerifier(state);
    if (verifier is null)
        return Results.BadRequest("Invalid or expired state");

    var token = await oauth.ExchangeSoundCloudCodeAsync(code, verifier);
    if (token is null)
        return Results.BadRequest("Token exchange failed");

    var meJson = await oauth.GetSoundCloudMeAsync(token.access_token);
    if (meJson is null)
        return Results.BadRequest("Failed to fetch user profile");

    var me = meJson.Value;
    var userId = me.TryGetProperty("urn", out var urn) ? urn.GetString() ?? "" : "";
    var username = me.TryGetProperty("username", out var un) ? un.GetString() ?? "" : "";
    var avatar = me.TryGetProperty("avatar_url", out var av) ? av.GetString() : null;

    if (opts.AdminUsers.Count > 0 && !opts.AdminUsers.Contains(userId))
        return Results.Forbid();

    var session = new Session
    {
        Id = PkceHelper.GenerateState(),
        Provider = "soundcloud",
        UserId = userId,
        DisplayName = username,
        AvatarUrl = avatar,
        AccessToken = token.access_token,
        RefreshToken = token.refresh_token,
        ExpiresAt = DateTimeOffset.UtcNow.AddSeconds(token.expires_in),
        CreatedAt = DateTimeOffset.UtcNow,
    };
    await EstablishSessionAsync(ctx, store, session);

    return Results.Redirect("/landing");
});

// ── Auth: initiate Google login ──────────────────────────────────────
app.MapGet("/auth/google", (SessionStore store, OAuthService oauth) =>
{
    var (verifier, challenge) = PkceHelper.Generate();
    var state = PkceHelper.GenerateState();
    store.StorePkceVerifier(state, verifier);
    var url = oauth.BuildGoogleAuthUrl(state, challenge);
    return Results.Redirect(url);
});

// ── Auth: Google callback ─────────────────────────────────────────────
app.MapGet("/auth/google/callback", async (
    HttpContext ctx, SessionStore store, OAuthService oauth) =>
{
    var code = ctx.Request.Query["code"].ToString();
    var state = ctx.Request.Query["state"].ToString();
    var error = ctx.Request.Query["error"].ToString();

    if (!string.IsNullOrEmpty(error))
        return Results.Redirect($"/login?error={HttpUtility.UrlEncode(error)}");
    if (string.IsNullOrEmpty(code) || string.IsNullOrEmpty(state))
        return Results.BadRequest("Missing code or state");

    var verifier = store.ConsumePkceVerifier(state);
    if (verifier is null)
        return Results.BadRequest("Invalid or expired state");

    var token = await oauth.ExchangeGoogleCodeAsync(code, verifier);
    if (token is null)
        return Results.BadRequest("Token exchange failed");

    var infoJson = await oauth.GetGoogleUserInfoAsync(token.access_token);
    if (infoJson is null)
        return Results.BadRequest("Failed to fetch user profile");

    var info = infoJson.Value;
    var userId = info.TryGetProperty("id", out var id) ? id.GetString() ?? "" : "";
    var name = info.TryGetProperty("name", out var n) ? n.GetString() ?? "" : "";
    var avatar = info.TryGetProperty("picture", out var p) ? p.GetString() : null;

    if (opts.AdminUsers.Count > 0 && !opts.AdminUsers.Contains(userId))
        return Results.Forbid();

    var session = new Session
    {
        Id = PkceHelper.GenerateState(),
        Provider = "google",
        UserId = userId,
        DisplayName = name,
        AvatarUrl = avatar,
        AccessToken = token.access_token,
        RefreshToken = token.refresh_token,
        ExpiresAt = DateTimeOffset.UtcNow.AddSeconds(token.expires_in),
        CreatedAt = DateTimeOffset.UtcNow,
    };
    await EstablishSessionAsync(ctx, store, session);

    return Results.Redirect("/landing");
});

// ── Auth: logout ──────────────────────────────────────────────────────
app.MapPost("/auth/logout", async (HttpContext ctx, SessionStore store) =>
{
    var sid = ctx.Request.Cookies["admin_sid"];
    if (!string.IsNullOrEmpty(sid))
        store.Remove(sid);
    ctx.Response.Cookies.Delete("admin_sid");
    await ctx.SignOutAsync("Cookies");
    return Results.Ok();
});

// ── Dev admin endpoints (localhost-only + DevPassword) ────────────────
// Intended for the host operator (opencode) to manage sessions and the
// allow-list without a browser.  Require the loopback Host header AND
// the DevPassword, so they are unreachable from ws-vision/remote.
static bool IsLocalhostRequest(HttpContext ctx)
{
    var host = ctx.Request.Host.Host ?? "";
    return host == "localhost" || host == "127.0.0.1" || host == "::1";
}

static IResult? CheckDevAdmin(HttpContext ctx, string? devPassword)
{
    if (!IsLocalhostRequest(ctx))
        return Results.Json(new { error = "localhost only" }, statusCode: 403);
    var pwd = ctx.Request.Query["password"].ToString();
    if (string.IsNullOrEmpty(devPassword) || pwd != devPassword)
        return Results.Json(new { error = "invalid password" }, statusCode: 401);
    return null;
}

app.MapPost("/admin/logout-all", (HttpContext ctx, SessionStore store) =>
{
    var gate = CheckDevAdmin(ctx, devPassword);
    if (gate is not null) return gate;
    store.RemoveAll();
    return Results.Ok(new { success = true });
}).AllowAnonymous();

app.MapPost("/admin/remove-user/{userId}", async (
    HttpContext ctx, string userId,
    AllowedUserStore allowed, PasskeyStore passkeyStore, SessionStore store) =>
{
    var gate = CheckDevAdmin(ctx, devPassword);
    if (gate is not null) return gate;
    if (string.IsNullOrWhiteSpace(userId))
        return Results.BadRequest("userId required");

    allowed.Revoke(userId);
    await passkeyStore.DeleteAllCredentialsAsync(userId);
    await passkeyStore.DeleteUserAsync(userId);
    return Results.Ok(new { success = true, userId });
}).AllowAnonymous();

// ── Landing page: GET hyperlinks ──────────────────────────────────────
app.MapGet("/api/landing", async (LandingPageStore store) =>
{
    var data = await store.LoadAsync();
    return Results.Ok(data);
});

// ── Landing page: Save hyperlinks ─────────────────────────────────────
app.MapPut("/api/landing", async (HttpContext ctx, LandingPageStore store) =>
{
    var data = await ctx.Request.ReadFromJsonAsync<LandingPageData>();
    if (data is null)
        return Results.BadRequest("Invalid payload");
    await store.SaveAsync(data);
    return Results.Ok(data);
}).RequireAuthorization();

// ── Landing page sections: GET (public, for the landing viewer) ───────
app.MapGet("/api/landing-sections", async (LandingSectionStore store) =>
{
    var data = await store.LoadAsync();
    return Results.Ok(data);
});

// ── Landing page sections: Save ──────────────────────────────────────
app.MapPut("/api/landing-sections", async (HttpContext ctx, LandingSectionStore store) =>
{
    var data = await ctx.Request.ReadFromJsonAsync<SectionContent>();
    if (data is null)
        return Results.BadRequest("Invalid payload");
    await store.SaveAsync(data);
    return Results.Ok(data);
}).RequireAuthorization();

// ── SoundCloud proxy: GET /api/soundcloud/me/{*path} ──────────────────
// Proxies to https://api.soundcloud.com/me/{path}?{query} with the user's token.
app.MapGet("/api/soundcloud/me/{*path}", async (
    HttpContext ctx, SessionStore store, SoundCloudProxyService proxy) =>
{
    var session = CurrentSession(ctx, store);
    if (session is null) return Results.Unauthorized();

    if (session.Provider != "soundcloud")
        return Results.BadRequest("SoundCloud login required for this endpoint");

    var subPath = "/" + (ctx.GetRouteValue("path")?.ToString() ?? "");
    var query = ctx.Request.QueryString.Value ?? "";
    var fullUrl = $"https://api.soundcloud.com/me{subPath}{query}";

    var (status, body, error) =
        await proxy.ProxyGetAsync(fullUrl, session.AccessToken!);

    // Auto-refresh on 401
    if (status == 401 && session.RefreshToken is not null)
    {
        var oauth = app.Services.GetRequiredService<OAuthService>();
        var refreshed = await oauth.RefreshSoundCloudTokenAsync(session.RefreshToken);
        if (refreshed is not null)
        {
            session.AccessToken = refreshed.access_token;
            session.RefreshToken = refreshed.refresh_token ?? session.RefreshToken;
            session.ExpiresAt = DateTimeOffset.UtcNow.AddSeconds(refreshed.expires_in);
            store.Create(session);

            var retry = await proxy.ProxyGetAsync(fullUrl, session.AccessToken!);
            if (retry.body is not null)
                return Results.Json(retry.body, statusCode: retry.status);
            return Results.Json(new { error = retry.error }, statusCode: retry.status);
        }
    }

    if (body is not null)
        return Results.Json(body, statusCode: status);
    return Results.Json(new { error }, statusCode: status);
}).RequireAuthorization();

// ── Serve static admin frontend (at root) ───────────────────────────
var staticDir = Path.Combine(app.Environment.ContentRootPath, "wwwroot");
if (Directory.Exists(staticDir))
{
    app.UseStaticFiles();
}

// Fallback for SPA routes — serve index.html for non-API, non-auth paths
app.MapFallback(context =>
{
    // Don't intercept API or auth routes
    if (context.Request.Path.StartsWithSegments("/auth")
        || context.Request.Path.StartsWithSegments("/api"))
    {
        context.Response.StatusCode = 404;
        return Task.CompletedTask;
    }

    var store = context.RequestServices.GetRequiredService<SessionStore>();
    var sid = context.Request.Cookies["admin_sid"];
    var isAdmin = sid is not null && store.IsValid(sid);

    // Redirect unauthenticated users to login (except the login page itself)
    if (!isAdmin && context.Request.Path != "/login")
    {
        context.Response.Redirect("/login");
        return Task.CompletedTask;
    }

    var index = Path.Combine(staticDir, "index.html");
    if (File.Exists(index))
    {
        context.Response.ContentType = "text/html; charset=utf-8";
        return context.Response.SendFileAsync(index);
    }

    context.Response.StatusCode = 404;
    return context.Response.WriteAsync("Not found");
});

app.Run();
