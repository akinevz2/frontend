using System.Text.Json.Serialization;

namespace Admin.Models;

/// <summary>
/// Stored WebAuthn credential (passkey) for a user.
/// </summary>
public sealed class PasskeyCredential
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public byte[] PublicKey { get; set; } = Array.Empty<byte>();
    public uint SignCount { get; set; }
    public string[] Transports { get; set; } = Array.Empty<string>();
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? LastUsedAt { get; set; }
    public string? DeviceName { get; set; }
}

public sealed class PasskeyUser
{
    public string Id { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public List<PasskeyCredential> Credentials { get; set; } = new();
}

public sealed class PasskeyRegistrationOptions
{
    public string Challenge { get; set; } = string.Empty;
    public string RpId { get; set; } = string.Empty;
    public string RpName { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string UserDisplayName { get; set; } = string.Empty;
    public int Timeout { get; set; } = 60000;
}

public sealed class PasskeyAuthenticationOptions
{
    public string Challenge { get; set; } = string.Empty;
    public string RpId { get; set; } = string.Empty;
    public int Timeout { get; set; } = 60000;
}

public sealed class PasskeyRegisterRequest
{
    public string DeviceName { get; set; } = string.Empty;
}

public sealed class PasskeyEnrollRequest
{
    public string UserId { get; set; } = string.Empty;
    public string DeviceName { get; set; } = string.Empty;
}
