> see ci
>

# ASP.NET Minimal API → Cloud Run via GitHub Actions

Deploy a single-file ASP.NET endpoint to Google Cloud Run, accessible at `admin.akinevz.com`. Everything triggered on `git push main`.

**Flow:** push → Actions → docker build → Artifact Registry → Cloud Run → Cloudflare DNS → `admin.akinevz.com`

Cloud Run free tier: 2 million requests/month, 360,000 GB-seconds. Sufficient for a personal site.  
Nearest region to Hove, UK: **europe-west1** (Belgium).

---

## Step 1 — GCP Setup

Firebase already lives in a GCP project. Enable two additional APIs in GCP Console:

- Artifact Registry API
- Cloud Run Admin API

Create a Service Account for GitHub Actions:

- Name: `github-actions-deploy`
- Roles: `roles/run.admin`, `roles/artifactregistry.writer`, `roles/iam.serviceAccountUser`
- Download JSON key → add to GitHub repo secrets as `GCP_SA_KEY`
- Also add secret `GCP_PROJECT_ID` = your GCP project ID

---

## Step 2 — Create Artifact Registry Repository

GCP Console → Artifact Registry → Create Repository:

- Name: `admin`
- Format: Docker
- Region: `europe-west1`

---

## Step 3 — ASP.NET Minimal API

Create folder `admin/` in the repo root.

**admin/Admin.csproj**
```xml
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net9.0</TargetFramework>
  </PropertyGroup>
</Project>
```

**admin/Program.cs**
```csharp
var app = WebApplication.Create(args);

app.MapGet("/", () => "nothing to see here");
app.MapGet("/status", () => Results.Ok(new { ok = true }));

app.Run();
```

**admin/Dockerfile**
```dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY . .
RUN dotnet publish -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Admin.dll"]
```

---

## Step 4 — GitHub Actions Workflow

Create `.github/workflows/deploy-admin.yml`:

```yaml
name: Deploy Admin to Cloud Run

on:
  push:
    branches: [main]
    paths: ['admin/**', '.github/workflows/deploy-admin.yml']

env:
  REGION: europe-west1
  SERVICE: admin
  IMAGE: europe-west1-docker.pkg.dev/${{ secrets.GCP_PROJECT_ID }}/admin/app

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - uses: google-github-actions/setup-gcloud@v2

      - run: gcloud auth configure-docker ${{ env.REGION }}-docker.pkg.dev

      - run: |
          docker build -t ${{ env.IMAGE }}:${{ github.sha }} ./admin
          docker push ${{ env.IMAGE }}:${{ github.sha }}

      - run: |
          gcloud run deploy ${{ env.SERVICE }} \
            --image ${{ env.IMAGE }}:${{ github.sha }} \
            --region ${{ env.REGION }} \
            --platform managed \
            --allow-unauthenticated \
            --port 8080
```

---

## Step 5 — Custom Domain: admin.akinevz.com

Cloud Run supports custom domains directly — no Firebase rewrite needed for a subdomain.

### 5a — Map domain in Cloud Run

```bash
gcloud beta run domain-mappings create \
  --service admin \
  --domain admin.akinevz.com \
  --region europe-west1
```

This outputs DNS records to add. They will look something like:

```
Type    Name     Value
CNAME   admin    ghs.googlehosted.com
```

### 5b — Add DNS record in Cloudflare

1. Cloudflare Dashboard → akinevz.com → DNS
2. Add record:
   - Type: `CNAME`
   - Name: `admin`
   - Target: `ghs.googlehosted.com`
   - **Proxy status: DNS only (grey cloud)** ← required, Cloud Run handles TLS itself
3. Save

> ⚠️ **Reminder:** Cloudflare proxy (orange cloud) must be OFF for Cloud Run custom domains. Cloud Run provisions its own TLS certificate via Google-managed SSL. Orange cloud will break certificate verification.

SSL certificate provisioning takes ~15 minutes after DNS propagates.

### 5c — Verify

```bash
gcloud beta run domain-mappings describe \
  --domain admin.akinevz.com \
  --region europe-west1
```

Status should show `CertificateProvisioned`.

---

## Step 6 — Firebase Hosting (main site, STABLE)

`firebase.json` stays as-is for the React SPA. The `/admin` path on the main domain is now unused — subdomain handles it instead.

```json
{
  "hosting": {
    "public": "dist",
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

---

## Step 7 — First Deploy

Push `admin/` and the workflow file. Actions will:

- Build the Docker image
- Push to Artifact Registry
- Deploy to Cloud Run as service `admin`

Then run domain mapping command from Step 5a, add Cloudflare DNS, wait for cert.

---

## Repo Structure

```
frontend/
├── admin/
│   ├── Admin.csproj
│   ├── Program.cs
│   └── Dockerfile
├── .github/
│   └── workflows/
│       ├── deploy-firebase.yml   ← existing
│       └── deploy-admin.yml      ← new
├── firebase.json
└── src/                          ← React frontend
```

---

## Notes

- Cloud Run scales to zero when idle — no cost when unused.
- `ASPNETCORE_URLS` must be `http://+:8080` — Cloud Run routes to port 8080 by default.
- `--allow-unauthenticated` exposes the endpoint publicly. Add auth middleware in `Program.cs` if needed.
- Artifact Registry storage billed after 500 MB free. Prune old image tags periodically.
- Cloudflare proxy must stay grey (DNS only) on the `admin` CNAME — never orange.
