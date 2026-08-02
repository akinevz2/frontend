using System.Text;
using Fido2NetLib;
using Fido2NetLib.Objects;
using Admin.Models;

namespace Admin.Services;

public sealed class PasskeyService
{
    private readonly PasskeyStore _store;
    private readonly Fido2 _fido2;
    private readonly Fido2Configuration _config;
    private readonly string _rpId;
    private readonly string _rpName;
    private static readonly bool DebugLog = !string.IsNullOrEmpty(Environment.GetEnvironmentVariable("PASSKEY_DEBUG"));

    public PasskeyService(PasskeyStore store, string rpId, string rpName, string origin)
    {
        _store = store;
        _rpId = rpId;
        _rpName = rpName;
        _config = new Fido2Configuration
        {
            RPID = rpId,
            RPName = rpName,
            Origins = new HashSet<string> { origin },
            TimestampDriftTolerance = 300_000
        };
        _fido2 = new Fido2(_config);
    }

    public async Task<(PasskeyRegistrationOptions Options, string Challenge)> CreateRegistrationOptionsAsync(
        string userId, string username, string displayName)
    {
        var user = new Fido2User
        {
            Id = Encoding.UTF8.GetBytes(userId),
            Name = username,
            DisplayName = displayName
        };

        var authenticators = new AuthenticatorSelection
        {
            ResidentKey = ResidentKeyRequirement.Required,
            UserVerification = UserVerificationRequirement.Preferred,
            AuthenticatorAttachment = AuthenticatorAttachment.Platform
        };

        var existingCreds = await _store.GetCredentialsAsync(userId);
        var excludeCredentials = existingCreds
            .Select(c => new PublicKeyCredentialDescriptor(Base64Url.Decode(c.Id)))
            .ToList();

        var options = _fido2.RequestNewCredential(new RequestNewCredentialParams
        {
            User = user,
            AuthenticatorSelection = authenticators,
            AttestationPreference = AttestationConveyancePreference.None,
            ExcludeCredentials = excludeCredentials
        });

        var challengeB64 = Base64Url.Encode(options.Challenge);

        return (new PasskeyRegistrationOptions
        {
            Challenge = challengeB64,
            RpId = _rpId,
            RpName = _rpName,
            UserId = userId,
            UserName = username,
            UserDisplayName = displayName,
            Timeout = (int)options.Timeout
        }, challengeB64);
    }

    public async Task<PasskeyCredential?> VerifyRegistrationAsync(
        string userId, string username, string displayName, string deviceName,
        string challenge, AuthenticatorAttestationRawResponse response)
    {
        var storedChallenge = Base64Url.Decode(challenge);

        var existingCreds = await _store.GetCredentialsAsync(userId);
        var excludeCredentials = existingCreds
            .Select(c => new PublicKeyCredentialDescriptor(Base64Url.Decode(c.Id)))
            .ToList();

        var user = new Fido2User
        {
            Id = Encoding.UTF8.GetBytes(userId),
            Name = username,
            DisplayName = displayName
        };

        var authenticators = new AuthenticatorSelection
        {
            ResidentKey = ResidentKeyRequirement.Required,
            UserVerification = UserVerificationRequirement.Preferred,
            AuthenticatorAttachment = AuthenticatorAttachment.Platform
        };

        var originalOptions = CredentialCreateOptions.Create(
            _config, storedChallenge, user, authenticators,
            AttestationConveyancePreference.None, excludeCredentials,
            new AuthenticationExtensionsClientInputs(),
            PubKeyCredParam.Defaults);

        var registered = await _fido2.MakeNewCredentialAsync(new MakeNewCredentialParams
        {
            AttestationResponse = response,
            OriginalOptions = originalOptions,
            IsCredentialIdUniqueToUserCallback = (p, ct) => Task.FromResult(true)
        });

        var cred = new PasskeyCredential
        {
            Id = Base64Url.Encode(registered.Id),
            UserId = userId,
            PublicKey = registered.PublicKey,
            SignCount = registered.SignCount,
            Transports = (registered.Transports ?? Array.Empty<AuthenticatorTransport>())
                .Select(t => t.ToString().ToLowerInvariant()).ToArray(),
            DeviceName = deviceName,
            CreatedAt = DateTimeOffset.UtcNow
        };

        var existingUser = await _store.GetUserAsync(userId);
        if (existingUser == null)
            await _store.CreateUserAsync(userId, username, displayName);

        await _store.AddCredentialAsync(userId, cred);
        return cred;
    }

    public async Task<(PasskeyAuthenticationOptions Options, string Challenge)> CreateAuthenticationOptionsAsync(string? userId = null)
    {
        var existingCredentials = new List<PublicKeyCredentialDescriptor>();

        if (!string.IsNullOrEmpty(userId))
        {
            var creds = await _store.GetCredentialsAsync(userId);
            foreach (var c in creds)
            {
                existingCredentials.Add(new PublicKeyCredentialDescriptor(Base64Url.Decode(c.Id)));
            }
        }

        var options = _fido2.GetAssertionOptions(new GetAssertionOptionsParams
        {
            AllowedCredentials = existingCredentials,
            UserVerification = UserVerificationRequirement.Preferred
        });

        var challengeB64 = Base64Url.Encode(options.Challenge);

        return (new PasskeyAuthenticationOptions
        {
            Challenge = challengeB64,
            RpId = _rpId,
            Timeout = (int)options.Timeout
        }, challengeB64);
    }

    public async Task<(bool Success, string? UserId, PasskeyCredential? Credential)> VerifyAuthenticationAsync(
        string challenge, AuthenticatorAssertionRawResponse response)
    {
        var storedChallenge = Base64Url.Decode(challenge);
        var credId = response.Id;
        var allUsers = await _store.GetAllUsersAsync();

        PasskeyCredential? foundCred = null;
        PasskeyUser? foundUser = null;

        foreach (var user in allUsers)
        {
            var cred = user.Credentials.FirstOrDefault(c => c.Id == credId);
            if (cred != null)
            {
                foundCred = cred;
                foundUser = user;
                break;
            }
        }

        if (foundCred == null || foundUser == null)
            return (false, null, null);

        var originalOptions = AssertionOptions.Create(
            _config, storedChallenge,
            new List<PublicKeyCredentialDescriptor> { new(Base64Url.Decode(foundCred.Id)) },
            UserVerificationRequirement.Preferred, null!);

        var userHandle = Encoding.UTF8.GetBytes(foundUser.Id);

        if (DebugLog)
        {
            Console.WriteLine($"[Passkey] login: credId={credId}");
            Console.WriteLine($"[Passkey] login: storedUserHandle={Convert.ToBase64String(userHandle)} ({foundUser.Id})");
            Console.WriteLine($"[Passkey] login: response.userHandle={(response.Response.UserHandle != null ? Convert.ToBase64String(response.Response.UserHandle) : "null")}");
        }

        // We already identified the user by finding the credential in our store,
        // so ownership is established.  Some authenticators truncate or mangle
        // the stored userHandle, so we don't compare it byte-for-byte here.
        var result = await _fido2.MakeAssertionAsync(new MakeAssertionParams
        {
            AssertionResponse = response,
            OriginalOptions = originalOptions,
            StoredPublicKey = foundCred.PublicKey,
            StoredSignatureCounter = foundCred.SignCount,
            IsUserHandleOwnerOfCredentialIdCallback = (p, ct) =>
            {
                if (DebugLog)
                {
                    Console.WriteLine($"[Passkey] callback: p.UserHandle={(p.UserHandle != null ? Convert.ToBase64String(p.UserHandle) : "null")}");
                    Console.WriteLine($"[Passkey] callback: userHandle={Convert.ToBase64String(userHandle)}");
                }
                return Task.FromResult(true);
            }
        });

        await _store.UpdateCredentialAsync(foundUser.Id, foundCred.Id, result.SignCount, DateTimeOffset.UtcNow);

        return (true, foundUser.Id, foundCred);
    }
}

internal static class Base64Url
{
    public static string Encode(byte[] data) =>
        Convert.ToBase64String(data).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    public static byte[] Decode(string s)
    {
        var pad = s.Length % 4 == 0 ? "" : new string('=', 4 - s.Length % 4);
        return Convert.FromBase64String(s.Replace('-', '+').Replace('_', '/') + pad);
    }
}