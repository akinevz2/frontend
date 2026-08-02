using System.Text.Json;
using System.Text.Json.Serialization;
using Admin.Models;

namespace Admin.Services;

/// <summary>
/// Persists the section-based landing page content to landing-sections.json.
/// Mirrors the public site's sections.json schema so the admin panel can
/// preview content consistently.
/// </summary>
public sealed class LandingSectionStore
{
    private readonly string _filePath;
    private readonly SemaphoreSlim _lock = new(1, 1);
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        WriteIndented = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public LandingSectionStore(AdminOptions opts)
    {
        _filePath = Path.Combine(opts.DataDir, "landing-sections.json");
        Directory.CreateDirectory(opts.DataDir);
    }

    public async Task<SectionContent> LoadAsync()
    {
        await _lock.WaitAsync();
        try
        {
            if (!File.Exists(_filePath))
                return DefaultContent();
            var json = await File.ReadAllTextAsync(_filePath);
            return JsonSerializer.Deserialize<SectionContent>(json, JsonOpts) ?? DefaultContent();
        }
        finally { _lock.Release(); }
    }

    public async Task SaveAsync(SectionContent data)
    {
        await _lock.WaitAsync();
        try { await File.WriteAllTextAsync(_filePath, JsonSerializer.Serialize(data, JsonOpts)); }
        finally { _lock.Release(); }
    }

    private static SectionContent DefaultContent() => new()
    {
        Heading = "Landing Page",
        Content = new List<object>
        {
            "Welcome to the admin landing page. Edit this content from the Tweaks tab.",
        }
    };
}