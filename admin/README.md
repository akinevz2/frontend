# Admin Control Panel

A self-hosted admin panel for the personal website, deployed on a home server (WS-VISION) via Tailscale. Provides social login (SoundCloud + Google), a configurable landing page with hyperlinks, and a SoundCloud profile data explorer.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  WS-VISION (home server, Tailscale network)             │
│                                                         │
│  nginx :8080 ──→ .NET 9 Admin Service :8090             │
│                   ├─ /blog/*       (React SPA, static)  │
│                   ├─ /auth/*        (OAuth flows)        │
│                   ├─ /api/landing   (hyperlinks CRUD)    │
│                   └─ /api/soundcloud/* (SC API proxy)   │
│                                                         │
│                   data/landing.json (JSON file storage) │
└─────────────────────────────────────────────────────────┘
         ▲
         │ Tailscale (all personal devices)
         │
    ┌────┴────┐
    │ Browser │  → http://ws-vision:8080/blog/login
    └─────────┘
```

- **Backend**: .NET 9 minimal API (`Program.cs`) with in-memory sessions + JSON file storage
- **Frontend**: Lightweight React 19 SPA (xp.css styled) served as static files by the backend
- **Auth**: OAuth 2.1 with PKCE (SoundCloud) + OAuth 2.0 with PKCE (Google)
- **No database**: Session state in memory, landing page data in `data/landing.json`
- **No additional hosting**: Runs entirely on your Tailscale-connected machine

## Project Structure

```
admin/
├── Admin.csproj              # .NET 9 project file
├── Program.cs                # All API endpoints (minimal API)
├── appsettings.json          # Default config (override via env vars)
├── appsettings.Development.json
├── Models/
│   └── AdminModels.cs        # Options, Session, LinkItem types
├── Services/
│   ├── PkceHelper.cs         # PKCE code challenge/verifier + state generation
│   ├── SessionStore.cs       # In-memory session + PKCE verifier store
│   ├── OAuthService.cs       # SoundCloud + Google OAuth (auth URL, token exchange, refresh)
│   ├── SoundCloudProxyService.cs  # Proxy GET to api.soundcloud.com
│   └── LandingPageStore.cs   # JSON file persistence for landing page data
├── frontend/
│   ├── package.json
│   ├── vite.config.ts        # Builds into ../wwwroot with /blog/ base
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx           # Login + Landing + SoundCloud pages
│   │   ├── styles.css
│   │   └── env.d.ts
│   └── index.html
├── deploy/
│   ├── admin.service         # systemd unit file
│   ├── admin.env             # Environment variables template
│   ├── nginx-admin.conf      # nginx reverse proxy config
│   └── deploy.sh             # One-command build + install script
├── Dockerfile                # Container build (alternative to systemd)
└── README.md                 # This file
```

## Setup

### Prerequisites on WS-VISION

1. **Docker Desktop** (Windows Pro machine — you're already installing this)
2. No .NET SDK or Node.js needed — the Dockerfile is a multi-stage build that handles everything

### Step 1: Register OAuth Apps

#### SoundCloud

1. Go to https://soundcloud.com/you/apps (requires Artist Pro)
2. Register a new app
3. Set redirect URI to: `http://ws-vision:8443/auth/soundcloud/callback`
4. Copy `client_id` and `client_secret`

#### Google

1. Go to https://console.cloud.google.com/apis/credentials
2. Create an OAuth 2.0 Client ID (Web application)
3. Add authorized redirect URI: `http://ws-vision:8443/auth/google/callback`
4. Copy `client_id` and `client_secret`

### Step 2: Configure Environment

Copy and edit the environment file:

```bash
cp admin/deploy/admin.env admin/deploy/admin.env.local
nano admin/deploy/admin.env.local
```

Fill in your `ClientId`, `ClientSecret`, and redirect URIs.

### Step 3: Build & Deploy (Docker)

```bash
# From the admin/ directory — builds image + starts container
bash deploy/deploy.sh --env-file deploy/admin.env.local

# Or build only:
bash deploy/deploy.sh --build-only

# Or with inline env vars:
docker build -t admin-panel .
docker run -d --name admin -p 8443:8443 \
  -v admin-data:/app/data \
  --env-file deploy/admin.env.local \
  --restart unless-stopped \
  admin-panel
```

### Step 4: Verify

```bash
curl http://ws-vision:8443/status
# → {"ok":true,"service":"admin","timestamp":"..."}

# Open in browser (from any Tailscale device):
open http://ws-vision:8443/login
```

### Stopping / Updating

```bash
# Stop the container
bash deploy/deploy.sh --stop

# Rebuild after code changes
bash deploy/deploy.sh
```

## Routes

The admin panel runs on WS-VISION behind `tailscale serve` at
`https://<fqdn>:8443`. Each page lives at its own path: the landing viewer is
public (the main site embeds it cross-site in an iframe), the login page is
opened in a top-level tab only when authenticating (the passkey ceremony needs
a real tab), and the control panel requires a session.

| Route (on WS-VISION)        | Auth              | Description                                 |
| --------------------------- | ----------------- | ------------------------------------------- |
| `/`                         | No                | Public landing page viewer (embedded iframe)|
| `/login`                    | No                | Login page (passkey + OAuth)                |
| `/panel`                    | Yes               | Admin control panel (landing/tweaks/devices)|
| `/landing`                  | Yes               | Legacy alias for `/panel`                   |
| `/auth/soundcloud`          | No                | Initiates SoundCloud OAuth flow             |
| `/auth/soundcloud/callback` | No                | SoundCloud OAuth callback                   |
| `/auth/google`              | No                | Initiates Google OAuth flow                 |
| `/auth/google/callback`     | No                | Google OAuth callback                       |
| `/auth/me`                  | Yes               | Returns current session info                |
| `/auth/logout`              | Yes               | Destroys session                            |
| `/api/landing`              | GET: No, PUT: Yes | Landing page data (hyperlinks)              |
| `/api/soundcloud/me/{path}` | Yes (SC)          | Proxies to SoundCloud `/me/*` API           |
| `/status`                   | No                | Health check                                |

## SoundCloud API Explorer

The SoundCloud page queries all exposed profile data from the SoundCloud API:

- **Profile** (`GET /me`)
- **Tracks** (`GET /me/tracks`)
- **Playlists** (`GET /me/playlists`)
- **Liked Tracks** (`GET /me/likes/tracks`)
- **Liked Playlists** (`GET /me/likes/playlists`)
- **Followers** (`GET /me/followers`)
- **Followings** (`GET /me/followings`)
- **Web Profiles** (`GET /me/web-profiles`)
- **Recently Played** (`GET /me/recently-played/tracks`)
- **Reposts (Tracks)** (`GET /me/reposts/tracks`)
- **Reposts (Playlists)** (`GET /me/reposts/playlists`)
- **Feed** (`GET /me/feed`)

Each section is expandable (collapsible `<details>`), fetched on demand, and renders the full JSON tree with nested expandable objects/arrays. Access tokens are refreshed automatically on expiry.

## Configuration Reference

All settings are in `appsettings.json` but should be overridden via environment variables (the `admin.env` file). Environment variables use `__` as the section separator:

| Env Var                    | Description                                     |
| -------------------------- | ----------------------------------------------- |
| `ASPNETCORE_URLS`          | Listen address (default: `http://0.0.0.0:8443`) |
| `AllowedOrigins__0`        | CORS origin for your static site                |
| `SiteOrigin`               | Public site origin                              |
| `SoundCloud__ClientId`     | SoundCloud OAuth client ID                      |
| `SoundCloud__ClientSecret` | SoundCloud OAuth client secret                  |
| `SoundCloud__RedirectUri`  | OAuth callback URL                              |
| `Google__ClientId`         | Google OAuth client ID                          |
| `Google__ClientSecret`     | Google OAuth client secret                      |
| `Google__RedirectUri`      | OAuth callback URL                              |
| `DataDir`                  | Path for JSON data files                        |
| `AdminUsers__0`            | Optional: restrict to specific user IDs         |

## Docker Build Details

The `Dockerfile` is a **multi-stage build** — no SDK or Node needed on the host:

```
Stage 1: node:22-slim      → builds React frontend → /wwwroot
Stage 2: dotnet/sdk:9.0     → builds .NET backend   → /app/publish
Stage 3: dotnet/aspnet:9.0  → runtime image (frontend + backend + data volume)
```

Build it anywhere Docker is available:

```bash
cd admin
docker build -t admin-panel .
docker run -d --name admin -p 8443:8443 \
  -v admin-data:/app/data \
  --env-file deploy/admin.env \
  --restart unless-stopped \
  admin-panel
```

The systemd + nginx configs in `deploy/` are kept as an alternative for bare-metal Linux hosts, but the Docker approach is the recommended path for WS-VISION.

## Security Notes

- Sessions are in-memory (lost on restart) with 7-day cookie expiry
- OAuth access tokens stored server-side only (never sent to browser)
- `admin_session` cookie is `HttpOnly` + `SameSite=Lax`
- CORS restricted to `AllowedOrigins`
- `robots: noindex, nofollow` on admin pages
- No password storage — authentication fully delegated to OAuth providers
- For production with HTTPS, set `CookieSecurePolicy.Always` and use TLS
