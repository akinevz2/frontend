using System.Text.Json.Serialization;

namespace Admin.Services;

/// <summary>
/// Manages the in-memory allow-list of user IDs permitted to enroll a passkey.
/// The list is seeded at startup from the .allowed-users file (one ID per line,
/// blank lines and # comments ignored) baked into the image at rebuild time.
/// Revocation is in-memory only and does not persist: it lasts until the next
/// rebuild/restart, at which point the file is re-read.
/// </summary>
public sealed class AllowedUserStore
{
    private readonly HashSet<string> _allowed = new(StringComparer.Ordinal);
    private readonly HashSet<string> _revoked = new(StringComparer.Ordinal);
    private readonly string _filePath;

    public AllowedUserStore(string dataDir)
    {
        // The .allowed-users file is COPY'd into the image at build time and
        // lives next to the published app.  Fall back to {dataDir} if absent.
        _filePath = File.Exists("/app/.allowed-users")
            ? "/app/.allowed-users"
            : Path.Combine(dataDir, ".allowed-users");
        Load();
    }

    private void Load()
    {
        if (!File.Exists(_filePath)) return;
        foreach (var raw in File.ReadAllLines(_filePath))
        {
            var line = raw.Trim();
            if (line.Length == 0 || line.StartsWith('#')) continue;
            _allowed.Add(line);
        }
    }

    /// <summary>True if the user ID is currently allowed (in file and not revoked).</summary>
    public bool IsAllowed(string userId) =>
        _allowed.Contains(userId) && !_revoked.Contains(userId);

    /// <summary>All user IDs from the file (regardless of revocation state).</summary>
    public IReadOnlyCollection<string> AllFileUsers => _allowed;

    /// <summary>Currently-allowed user IDs (file minus revoked).</summary>
    public IReadOnlyCollection<string> CurrentAllowed =>
        _allowed.Where(id => !_revoked.Contains(id)).ToArray();

    /// <summary>Revoke a user ID in-memory until next restart/rebuild.</summary>
    public void Revoke(string userId)
    {
        if (_allowed.Contains(userId))
            _revoked.Add(userId);
    }

    /// <summary>Re-enable a previously in-memory-revoked user ID (un-revoke).</summary>
    public void Restore(string userId) => _revoked.Remove(userId);

    public bool IsRevoked(string userId) => _revoked.Contains(userId);
}

public sealed class AllowedUserInfo
{
    public string UserId { get; set; } = string.Empty;
    public bool Allowed { get; set; }
    public bool HasPasskey { get; set; }
    public string? DeviceName { get; set; }
    public DateTimeOffset? EnrolledAt { get; set; }
    public DateTimeOffset? LastUsedAt { get; set; }
}