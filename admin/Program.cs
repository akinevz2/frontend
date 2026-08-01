using System.Web;
using Admin.Models;
using Admin.Services;

var builder = WebApplication.CreateBuilder(args);

// Bind options
builder.Services.Configure<AdminOptions>(builder.Configuration);
var opts = builder.Configuration.Get<AdminOptions>()
    ?? new AdminOptions();

// ── Generate / load self-signed SSL certificate ───────────────────────
// Persists to {DataDir}/certs/admin.pfx — regenerated only on first run
// or when it's about to expire.  Includes SANs for all CertSubjectNames.
builder.Services.AddSingleton<CertManager>();
var certManager = new CertManager(opts);
var sslCert = certManager.GetOrCreateCertificate(
    (opts.CertSubjectNames.Count > 0 ? opts.CertSubjectNames : new List<string> { "ws-vision" })
        .ToArray());

Console.WriteLine($"[Admin] SSL cert path: {certManager.CertPath}");
Console.WriteLine($"[Admin] SSL cert SANs: {string.Join(", ", opts.CertSubjectNames)}");

// ── Configure Kestrel ─────────────────────────────────────────────────
// If UseHttps is on, we listen on 8443 (HTTPS).  HTTP on 8080 redirects to HTTPS.
builder.WebHost.ConfigureKestrel(kestrel =>
{
    if (opts.UseHttps)
    {
        kestrel.ListenAnyIP(8443, listen =>
        {
            listen.UseHttps(sslCert);
        });
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

// Cookie-based auth
builder.Services.AddAuthentication("Cookies")
    .AddCookie("Cookies", o =>
    {
        o.Cookie.Name = "admin_session";
        o.Cookie.HttpOnly = true;
        o.Cookie.SecurePolicy = CookieSecurePolicy.Always;
        o.Cookie.SameSite = SameSiteMode.Lax;
        o.Cookie.Expiration = TimeSpan.FromDays(7);
        o.LoginPath = "/auth/login";
        o.ExpireTimeSpan = TimeSpan.FromDays(7);
    });
builder.Services.AddAuthorization();

var app = builder.Build();

// CORS - allow the frontend SPA origin
app.UseCors(p => p
    .WithOrigins(opts.AllowedOrigins.ToArray())
    .AllowAnyMethod()
    .AllowAnyHeader()
    .AllowCredentials());

// HSTS in production (tells browser to always use HTTPS for this host)
if (!app.Environment.IsDevelopment() && opts.UseHttps)
{
    app.UseHsts(new HstsOptions { MaxAge = TimeSpan.FromDays(365) });
}

// HTTP → HTTPS redirect
if (opts.UseHttps)
{
    app.UseHttpsRedirection(new HttpsRedirectionOptions
    {
        HttpsPort = 8443,
    });
}

app.UseAuthentication();
app.UseAuthorization();

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
    var sid = ctx.Request.Cookies["admin_session"];
    if (string.IsNullOrEmpty(sid)) return Results.Unauthorized();
    var s = store.Get(sid);
    if (s is null || !store.IsValid(sid)) return Results.Unauthorized();
    return Results.Ok(new
    {
        provider = s.Provider,
        displayName = s.DisplayName,
        avatarUrl = s.AvatarUrl,
        userId = s.UserId,
    });
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
    store.Create(session);

    ctx.Response.Cookies.Append("admin_session", session.Id, new CookieOptions
    {
        HttpOnly = true,
        SameSite = SameSiteMode.Lax,
        MaxAge = TimeSpan.FromDays(7),
    });

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
    store.Create(session);

    ctx.Response.Cookies.Append("admin_session", session.Id, new CookieOptions
    {
        HttpOnly = true,
        SameSite = SameSiteMode.Lax,
        MaxAge = TimeSpan.FromDays(7),
    });

    return Results.Redirect("/landing");
});

// ── Auth: logout ──────────────────────────────────────────────────────
app.MapPost("/auth/logout", (HttpContext ctx, SessionStore store) =>
{
    var sid = ctx.Request.Cookies["admin_session"];
    if (!string.IsNullOrEmpty(sid))
        store.Remove(sid);
    ctx.Response.Cookies.Delete("admin_session");
    return Results.Ok();
});

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

// ── SoundCloud proxy: GET /api/soundcloud/me/{*path} ──────────────────
// Proxies to https://api.soundcloud.com/me/{path}?{query} with the user's token.
app.MapGet("/api/soundcloud/me/{*path}", async (
    HttpContext ctx, SessionStore store, SoundCloudProxyService proxy) =>
{
    var sid = ctx.Request.Cookies["admin_session"];
    if (string.IsNullOrEmpty(sid))
        return Results.Unauthorized();
    var session = store.Get(sid);
    if (session is null || !store.IsValid(sid))
        return Results.Unauthorized();

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

    var sid = context.Request.Cookies["admin_session"];
    var store = context.RequestServices.GetRequiredService<SessionStore>();
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
