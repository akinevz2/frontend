using System.Collections.Concurrent;
using Admin.Models;

namespace Admin.Services;

/// <summary>
/// In-memory session store.  Sessions are keyed by a random cookie value.
/// Also stores pending OAuth state→verifier pairs for PKCE validation.
/// </summary>
public class SessionStore
{
    private readonly ConcurrentDictionary<string, Session> _sessions = new();
    private readonly ConcurrentDictionary<string, string> _pkceVerifiers = new();

    public Session Create(Session session)
    {
        _sessions[session.Id] = session;
        return session;
    }

    public Session? Get(string id) =>
        _sessions.TryGetValue(id, out var s) ? s : null;

    public void Remove(string id) => _sessions.TryRemove(id, out _);

    public bool IsValid(string id)
    {
        if (!_sessions.TryGetValue(id, out var s)) return false;
        return s.ExpiresAt > DateTimeOffset.UtcNow;
    }

    public void StorePkceVerifier(string state, string verifier) =>
        _pkceVerifiers[state] = verifier;

    public string? ConsumePkceVerifier(string state)
    {
        _pkceVerifiers.TryRemove(state, out var v);
        return v;
    }

    public void CleanupExpired()
    {
        var now = DateTimeOffset.UtcNow;
        foreach (var (id, s) in _sessions)
        {
            if (s.ExpiresAt <= now)
                _sessions.TryRemove(id, out _);
        }
    }
}