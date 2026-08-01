using System.Text.Json;
using Admin.Models;

namespace Admin.Services;

/// <summary>
/// Persists landing page data (heading + hyperlinks) to a JSON file on disk.
/// The file lives at {DataDir}/landing.json.  This is the "minimal API"
/// storage - no database, just a single JSON file.
/// </summary>
public class LandingPageStore
{
    private readonly string _filePath;
    private readonly SemaphoreSlim _lock = new(1, 1);
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        WriteIndented = true,
    };

    public LandingPageStore(AdminOptions opts)
    {
        _filePath = Path.Combine(opts.DataDir, "landing.json");
        Directory.CreateDirectory(opts.DataDir);
    }

    public async Task<LandingPageData> LoadAsync()
    {
        await _lock.WaitAsync();
        try
        {
            if (!File.Exists(_filePath))
                return new LandingPageData();

            var json = await File.ReadAllTextAsync(_filePath);
            return JsonSerializer.Deserialize<LandingPageData>(json, JsonOpts)
                ?? new LandingPageData();
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task SaveAsync(LandingPageData data)
    {
        await _lock.WaitAsync();
        try
        {
            var json = JsonSerializer.Serialize(data, JsonOpts);
            await File.WriteAllTextAsync(_filePath, json);
        }
        finally
        {
            _lock.Release();
        }
    }
}