// Dev auth handler - only active when DevPassword env var is set
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;
using System.Text.Encodings.Web;
using System.Security.Claims;

namespace Admin.Services;

public class DevAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    private readonly IConfiguration _config;
    public DevAuthHandler(IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger, UrlEncoder encoder, ISystemClock clock, IConfiguration config)
        : base(options, logger, encoder, clock) { _config = config; }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
{
        return Task.FromResult(AuthenticateResult.NoResult());
    }
}