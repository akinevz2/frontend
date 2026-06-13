var builder = WebApplication.CreateBuilder(args);

var app = builder.Build();

app.MapGet("/", () => Results.Text("nothing to see here", "text/plain"));
app.MapGet("/status", () => TypedResults.Ok(new { ok = true, service = "admin", timestamp = DateTimeOffset.UtcNow }));

app.Run();
