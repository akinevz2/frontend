using System.Text.Json;
using System.Text.Json.Serialization;
using Admin.Models;

namespace Admin.Services;

public sealed class PasskeyStore
{
    private readonly string _filePath;
    private readonly SemaphoreSlim _lock = new(1, 1);
    private Dictionary<string, PasskeyUser> _users = new();
    private bool _loaded;

    public PasskeyStore(string dataDir)
    {
        Directory.CreateDirectory(dataDir);
        _filePath = Path.Combine(dataDir, "passkeys.json");
    }

    private async Task EnsureLoadedAsync()
    {
        if (_loaded) return;
        await _lock.WaitAsync();
        try
        {
            if (_loaded) return;
            if (File.Exists(_filePath))
            {
                var json = await File.ReadAllTextAsync(_filePath);
                var list = JsonSerializer.Deserialize<List<PasskeyUser>>(json, JsonOpts.Default);
                _users = list?.ToDictionary(u => u.Id) ?? new();
            }
            _loaded = true;
        }
        finally
        {
            _lock.Release();
        }
    }

    private async Task SaveAsync()
    {
        var json = JsonSerializer.Serialize(_users.Values.ToList(), JsonOpts.Default);
        await File.WriteAllTextAsync(_filePath, json);
    }

    public async Task<PasskeyUser?> GetUserAsync(string userId)
    {
        await EnsureLoadedAsync();
        _users.TryGetValue(userId, out var user);
        return user;
    }

    public async Task<PasskeyUser> CreateUserAsync(string userId, string username, string displayName)
    {
        await EnsureLoadedAsync();
        var user = new PasskeyUser { Id = userId, Username = username, DisplayName = displayName };
        _users[userId] = user;
        await SaveAsync();
        return user;
    }

    public async Task AddCredentialAsync(string userId, PasskeyCredential credential)
    {
        await EnsureLoadedAsync();
        if (_users.TryGetValue(userId, out var user))
        {
            user.Credentials.Add(credential);
            await SaveAsync();
        }
    }

    public async Task UpdateCredentialAsync(string userId, string credentialId, uint signCount, DateTimeOffset lastUsed)
    {
        await EnsureLoadedAsync();
        if (_users.TryGetValue(userId, out var user))
        {
            var cred = user.Credentials.FirstOrDefault(c => c.Id == credentialId);
            if (cred != null)
            {
                cred.SignCount = signCount;
                cred.LastUsedAt = lastUsed;
                await SaveAsync();
            }
        }
    }

    public async Task<List<PasskeyCredential>> GetCredentialsAsync(string userId)
    {
        await EnsureLoadedAsync();
        if (_users.TryGetValue(userId, out var user))
            return user.Credentials;
        return new();
    }

    public async Task DeleteCredentialAsync(string userId, string credentialId)
    {
        await EnsureLoadedAsync();
        if (_users.TryGetValue(userId, out var user))
        {
            user.Credentials.RemoveAll(c => c.Id == credentialId);
            await SaveAsync();
        }
    }

    public async Task<List<PasskeyUser>> GetAllUsersAsync()
    {
        await EnsureLoadedAsync();
        return _users.Values.ToList();
    }

    /// <summary>Delete every credential for a user (revoke + wipe passkey).</summary>
    public async Task DeleteAllCredentialsAsync(string userId)
    {
        await EnsureLoadedAsync();
        if (_users.TryGetValue(userId, out var user))
        {
            user.Credentials.Clear();
            await SaveAsync();
        }
    }

    /// <summary>Delete an entire user record and all their credentials.</summary>
    public async Task DeleteUserAsync(string userId)
    {
        await EnsureLoadedAsync();
        _users.Remove(userId);
        await SaveAsync();
    }
}

internal static class JsonOpts
{
    public static readonly JsonSerializerOptions Default = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };
}
