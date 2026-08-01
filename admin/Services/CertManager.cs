using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;

namespace Admin.Services;

/// <summary>
/// Generates a self-signed SSL certificate on first start, persists it to
/// disk, and reuses it on subsequent starts.  This lets the admin panel serve
/// HTTPS without a public CA — the cert is self-signed so browsers will show
/// a warning, but the connection is still encrypted.
///
/// Tailscale's MagicDNS name (e.g. "ws-vision") can be included as a SAN so
/// that devices on the tailnet can connect via https://ws-vision:8443 without
/// a hostname mismatch.
/// </summary>
public sealed class CertManager
{
    private readonly string _certPath;
    private readonly string _certDir;

    public CertManager(AdminOptions opts)
    {
        _certDir = Path.Combine(opts.DataDir, "certs");
        _certPath = Path.Combine(_certDir, "admin.pfx");
        Directory.CreateDirectory(_certDir);
    }

    /// <summary>
    /// Load an existing cert from disk, or generate a new one if none exists.
    /// Returns an X509Certificate2 suitable for Kestrel's HTTPS binding.
    /// </summary>
    public X509Certificate2 GetOrCreateCertificate(string[] subjectNames)
    {
        if (File.Exists(_certPath))
        {
            try
            {
                var existing = X509CertificateLoader.LoadPkcs12FromFile(
                    _certPath, "admin-cert-password");
                if (existing.NotAfter > DateTimeOffset.UtcNow.AddDays(1))
                    return existing;
                // Cert is expiring soon — regenerate
            }
            catch
            {
                // Corrupt cert file — regenerate
            }
        }

        return GenerateAndSave(subjectNames);
    }

    private X509Certificate2 GenerateAndSave(string[] subjectNames)
    {
        // Use RSA 2048 — widely compatible
        using var rsa = RSA.Create(2048);

        var primaryName = subjectNames.FirstOrDefault() ?? "ws-vision";
        var subject = new X500DistinguishedName($"CN={primaryName}");

        var req = new CertificateRequest(
            subject, rsa, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);

        // Add Subject Alternative Names (SANs) for all hostnames/IPs
        var sanBuilder = new SubjectAlternativeNameBuilder();
        foreach (var name in subjectNames.Distinct())
        {
            // Determine if it's an IP address or a DNS name
            if (System.Net.IPAddress.TryParse(name, out _))
                sanBuilder.AddIpAddress(System.Net.IPAddress.Parse(name));
            else
                sanBuilder.AddDnsName(name);
        }
        req.CertificateExtensions.Add(sanBuilder.Build());

        // Basic constraints: this is a server certificate
        req.CertificateExtensions.Add(
            new X509BasicConstraintsExtension(false, false, 0, true));

        // Key usage: digital signature + key encipherment
        req.CertificateExtensions.Add(
            new X509KeyUsageExtension(
                X509KeyUsageFlags.DigitalSignature | X509KeyUsageFlags.KeyEncipherment,
                true));

        // Extended key usage: server authentication
        req.CertificateExtensions.Add(
            new X509EnhancedKeyUsageExtension(
                new OidCollection { new("1.3.6.1.5.5.7.3.1") }, // serverAuth
                true));

        // Valid for 1 year
        var notBefore = DateTimeOffset.UtcNow.AddMinutes(-1);
        var notAfter = notBefore.AddYears(1);

        using var cert = req.CreateSelfSigned(notBefore, notAfter);

        // Export as PFX so Kestrel can load it
        var pfxBytes = cert.Export(X509ContentType.Pfx, "admin-cert-password");

        File.WriteAllBytes(_certPath, pfxBytes);

        return X509CertificateLoader.LoadPkcs12(pfxBytes, "admin-cert-password");
    }

    /// <summary>
    /// Returns the path where the cert is stored (for informational/logging purposes).
    /// </summary>
    public string CertPath => _certPath;
}