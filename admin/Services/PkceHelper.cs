using System.Security.Cryptography;
using System.Text;

namespace Admin.Services;

/// <summary>
/// PKCE (Proof Key for Code Exchange) helper - generates a random code
/// verifier and derives the S256 code challenge.  Required by SoundCloud's
/// OAuth 2.1 implementation.
/// </summary>
public static class PkceHelper
{
    public static (string Verifier, string Challenge) Generate()
    {
        var bytes = RandomNumberGenerator.GetBytes(64);
        var verifier = Base64UrlEncode(bytes);
        var challenge = Base64UrlEncode(SHA256.HashData(Encoding.ASCII.GetBytes(verifier)));
        return (verifier, challenge);
    }

    public static string Base64UrlEncode(byte[] data)
    {
        return Convert.ToBase64String(data)
            .Replace('+', '-')
            .Replace('/', '_')
            .TrimEnd('=');
    }

    public static string GenerateState()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        return Base64UrlEncode(bytes);
    }
}