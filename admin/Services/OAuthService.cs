using Admin.Models;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Web;

namespace Admin.Services;

/// <summary>
/// Handles OAuth flows for both SoundCloud and Google - authorization URL
/// generation, token exchange, and token refresh.  All network calls go
/// through a single HttpClient with automatic redirect disabled so we can
/// capture redirect responses (needed for some SoundCloud endpoints).
/// </summary>
public sealed class OAuthService : IDisposable
{
    private readonly HttpClient _http;
    private readonly AdminOptions _opts;

    public OAuthService(AdminOptions opts)
    {
        _opts = opts;
        _http = new HttpClient(new HttpClientHandler
        {
            AllowAutoRedirect = false,
        });
    }

    // ── SoundCloud ────────────────────────────────────────────────────

    public string BuildSoundCloudAuthUrl(string state, string codeChallenge)
    {
        var cb = HttpUtility.ParseQueryString(string.Empty);
        cb["client_id"] = _opts.SoundCloud.ClientId;
        cb["redirect_uri"] = _opts.SoundCloud.RedirectUri;
        cb["response_type"] = "code";
        cb["code_challenge"] = codeChallenge;
        cb["code_challenge_method"] = "S256";
        cb["state"] = state;
        return $"https://secure.soundcloud.com/authorize?{cb}";
    }

    public async Task<TokenResponse?> ExchangeSoundCloudCodeAsync(
        string code, string codeVerifier)
    {
        var content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["grant_type"] = "authorization_code",
            ["client_id"] = _opts.SoundCloud.ClientId,
            ["client_secret"] = _opts.SoundCloud.ClientSecret,
            ["redirect_uri"] = _opts.SoundCloud.RedirectUri,
            ["code_verifier"] = codeVerifier,
            ["code"] = code,
        });

        return await PostTokenAsync("https://secure.soundcloud.com/oauth/token", content);
    }

    public async Task<TokenResponse?> RefreshSoundCloudTokenAsync(string refreshToken)
    {
        var content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["grant_type"] = "refresh_token",
            ["client_id"] = _opts.SoundCloud.ClientId,
            ["client_secret"] = _opts.SoundCloud.ClientSecret,
            ["refresh_token"] = refreshToken,
        });

        return await PostTokenAsync("https://secure.soundcloud.com/oauth/token", content);
    }

    public async Task<JsonElement?> GetSoundCloudMeAsync(string accessToken)
    {
        var req = new HttpRequestMessage(HttpMethod.Get, "https://api.soundcloud.com/me");
        req.Headers.Authorization = new AuthenticationHeaderValue("OAuth", accessToken);
        req.Headers.Accept.ParseAdd("application/json; charset=utf-8");

        var resp = await _http.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return null;
        return await resp.Content.ReadFromJsonAsync<JsonElement>();
    }

    // ── Google ─────────────────────────────────────────────────────────

    public string BuildGoogleAuthUrl(string state, string codeChallenge)
    {
        var cb = HttpUtility.ParseQueryString(string.Empty);
        cb["client_id"] = _opts.Google.ClientId;
        cb["redirect_uri"] = _opts.Google.RedirectUri;
        cb["response_type"] = "code";
        cb["scope"] = "openid email profile";
        cb["code_challenge"] = codeChallenge;
        cb["code_challenge_method"] = "S256";
        cb["state"] = state;
        return $"https://accounts.google.com/o/oauth2/v2/auth?{cb}";
    }

    public async Task<TokenResponse?> ExchangeGoogleCodeAsync(
        string code, string codeVerifier)
    {
        var content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["grant_type"] = "authorization_code",
            ["client_id"] = _opts.Google.ClientId,
            ["client_secret"] = _opts.Google.ClientSecret,
            ["redirect_uri"] = _opts.Google.RedirectUri,
            ["code_verifier"] = codeVerifier,
            ["code"] = code,
        });

        return await PostTokenAsync("https://oauth2.googleapis.com/token", content);
    }

    public async Task<JsonElement?> GetGoogleUserInfoAsync(string accessToken)
    {
        var req = new HttpRequestMessage(HttpMethod.Get,
            "https://www.googleapis.com/oauth2/v2/userinfo");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var resp = await _http.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return null;
        return await resp.Content.ReadFromJsonAsync<JsonElement>();
    }

    // ── Shared ─────────────────────────────────────────────────────────

    private async Task<TokenResponse?> PostTokenAsync(string url, FormUrlEncodedContent content)
    {
        content.Headers.ContentType = new MediaTypeHeaderValue("application/x-www-form-urlencoded");
        var resp = await _http.PostAsync(url, content);
        if (!resp.IsSuccessStatusCode) return null;
        return await resp.Content.ReadFromJsonAsync<TokenResponse>();
    }

    public void Dispose() => _http.Dispose();
}

public sealed class TokenResponse
{
    public string access_token { get; set; } = string.Empty;
    public string? refresh_token { get; set; }
    public int expires_in { get; set; }
    public string? scope { get; set; }
}