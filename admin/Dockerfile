# ── Stage 1: Build the React frontend with Node ────────────────────────
FROM node:22-slim AS frontend-build
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci 2>/dev/null || npm install
COPY frontend/ ./
RUN npm run build
# Output lands in /frontend/../wwwroot → /wwwroot

# ── Stage 2: Build the .NET backend ───────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS backend-build
WORKDIR /src
COPY Admin.csproj ./
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /app/publish --no-restore

# ── Stage 3: Runtime image ────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
# 8080 = HTTP (behind a TLS-terminating reverse proxy such as `tailscale serve`)
EXPOSE 8080
# Kestrel is configured in Program.cs (ConfigureKestrel), so no ASPNETCORE_URLS needed
VOLUME /app/data
VOLUME /app/data/certs

COPY --from=backend-build /app/publish ./
COPY --from=frontend-build /wwwroot ./wwwroot
# Allowed user IDs list (one per line; # comments allowed). Rebuild to apply changes.
COPY .allowed-users ./

ENTRYPOINT ["dotnet", "Admin.dll"]
