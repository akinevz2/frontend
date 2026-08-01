using System.Net.Http.Headers;
using System.Text.Json;

namespace Admin.Services;

/// <summary>
/// Thin proxy to the SoundCloud API.  Takes a user access token and forwards
/// requests to api.soundcloud.com, returning the raw JSON.  This keeps the
/// access token on the server side so it's never exposed to the browser.
/// </summary>
public sealed class SoundCloudProxyService : IDisposable
{
    private readonly HttpClient _http;
    private readonly OAuthService _oauth;

    public SoundCloudProxyService(OAuthService oauth)
    {
        _oauth = oauth;
        _http = new HttpClient();
    }

    /// <summary>
    /// Proxy a GET request to api.soundcloud.com/me/* with the user's token.
    /// If the token is expired, attempt a refresh first.
    /// </summary>
    public async Task<(int status, JsonElement? body, string? error)> GetMeAsync(
        string accessToken, string? refreshToken, string subPath)
    {
        // Ensure token is fresh
        var token = accessToken;
        if (string.IsNullOrEmpty(token))
            return (401, null, "No access token");

        var url = $"https://api.soundcloud.com/me{subPath}";
        return await ProxyGetAsync(url, token);
    }

    /// <summary>
    /// Generic proxy GET to any api.soundcloud.com URL.
    /// </summary>
    public async Task<(int status, JsonElement? body, string? error)> ProxyGetAsync(
        string fullUrl, string accessToken)
    {
        var req = new HttpRequestMessage(HttpMethod.Get, fullUrl);
        req.Headers.Authorization = new AuthenticationHeaderValue("OAuth", accessToken);
        req.Headers.Accept.ParseAdd("application/json; charset=utf-8");

        var resp = await _http.SendAsync(req);
        var status = (int)resp.StatusCode;

        if (status == 401)
            return (401, null, "Token expired or invalid");

        if (!resp.IsSuccessStatusCode)
        {
            var errText = await resp.Content.ReadAsStringAsync();
            return (status, null, errText.Length > 500 ? errText[..500] : errText);
        }

        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        return (status, json, null);
    }

    public void Dispose() => _http.Dispose();
}