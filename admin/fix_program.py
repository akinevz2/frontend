with open('/home/kine/frontend/admin/Program.cs', 'r') as f:
    content = f.read()

old = 'builder.Services.AddAuthorization();'
new = '''builder.Services.AddAuthorization();

// HSTS in production (tells browser to always use HTTPS for this host)
if (!builder.Environment.IsDevelopment() && opts.UseHttps)
{
    builder.Services.Configure<HstsOptions>(o => o.MaxAge = TimeSpan.FromDays(365));
}

// HTTPS redirection port (since Kestrel listens on 8443 for HTTPS)
if (opts.UseHttps)
{
    builder.Services.Configure<HttpsRedirectionOptions>(o => o.HttpsPort = 8443);
}'''

content = content.replace(old, new)

with open('/home/kine/frontend/admin/Program.cs', 'w') as f:
    f.write(content)

print('Done')
