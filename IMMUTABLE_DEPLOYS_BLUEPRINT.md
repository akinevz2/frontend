# Immutable Deploy Blueprint (TypeScript-Centric)

## Goal
Produce a static website where a remote visitor receives exactly the content authored in this repository at a specific commit, with no mutable runtime content dependencies.

This document defines the ideal final-state engineering configuration.

## Security and Integrity Invariants
1. No runtime fetches for authored content from third-party origins.
2. All user-visible content is versioned in git or generated deterministically from versioned inputs.
3. Build is deterministic from a pinned toolchain and pinned dependency graph.
4. Deployment artifacts are immutable, content-addressed, and traceable to a single git commit.
5. Browser-executed resources are constrained by strict CSP and integrity checks.

## Final Architecture
1. Authoring sources: `src/**`, `public/**`, versioned JSON/Markdown content in-repo.
2. Build-time data ingestion only: external content is pulled in CI once, validated, hashed, committed (or included in artifact), never fetched in client runtime.
3. Output artifact: static files under `dist/` with content-hashed filenames and immutable cache headers.
4. Deploy target: object storage or CDN with immutable objects; each deploy addressed by commit SHA.

## Permitted TypeScript Scoped Changes

### 1) Deterministic Route Metadata
- Keep route metadata in one typed source (`src/pages.ts`), not ad-hoc JSON edits.
- Generate sitemap, OpenGraph metadata, and route shells from the same typed source.

## Build Determinism Requirements

### Toolchain Pinning
1. Pin Node exactly (for example `24.18.0`) in all places:
   - `.nvmrc`
   - `package.json` `engines.node`
   - CI setup-node exact version
   - devcontainer feature version (no `latest`)
2. Pin package manager behavior:
   - include `packageManager` field with exact npm version
   - always use `npm ci` in CI and release builds
3. Commit lockfile and fail CI if lockfile drift occurs.

### Dependency Policy
1. No caret (`^`) or tilde (`~`) for production dependencies in final hard mode.
2. Require dependency review for:
   - markdown/rendering libraries
   - build plugins
   - network/client libraries
3. Generate SBOM (CycloneDX or SPDX) each release and store with artifact.

### Script Execution Policy
1. Build command should run with minimal script surface.
2. Disallow unreviewed postinstall hooks in CI:
   - `npm ci --ignore-scripts`
   - run only explicitly reviewed build scripts afterward.
3. Any generator script must be TypeScript, checked and linted like app code.

## Vite and Output Hardening
1. Use deterministic build mode:
   - fixed environment variables
   - no timestamp embedding in generated content
2. Enable manifest and checksum outputs:
   - produce `dist/manifest.json`
   - produce `dist/checksums.txt` (`sha256sum` for all files)
3. Ensure all JS/CSS are content-hashed file names.
4. Remove mutable runtime config blobs unless they are signed and integrity-checked.

## Browser Integrity Controls

### CSP (Strict Static Site Profile)
Set response header:
- `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' https: data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; upgrade-insecure-requests`

### Additional Headers
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: no-referrer`
- `Permissions-Policy: geolocation=(), camera=(), microphone=()`
- `Cross-Origin-Resource-Policy: same-origin`

### Subresource Integrity
- For any non-self hosted third-party resource (ideally none), require SRI and immutable version pins.

## Deploy Immutability Model
1. Build artifact key includes commit SHA: `site/<git-sha>/...`
2. Publish atomically; never mutate objects in-place.
3. Route switch is pointer-only (for example update `current` alias to SHA directory).
4. Rollback is pointer flip to previous SHA artifact.
5. Store and publish provenance:
   - git commit
   - toolchain versions
   - lockfile digest
   - artifact checksums

## CI/CD Reference Pipeline
1. Checkout exact commit (detached HEAD).
2. Verify repository state:
   - signed commit policy (optional but recommended)
   - lockfile STABLE
3. Setup pinned Node/npm versions.
4. `npm ci --ignore-scripts`
5. Run audited internal scripts explicitly:
   - content fetch (optional, pinned SHA source)
   - content validation
   - content freeze
6. Typecheck + lint + tests.
7. Build static artifact.
8. Compute checksums and generate SBOM.
9. Verify no runtime external content endpoints remain in bundle (static scan).
10. Deploy immutable artifact by SHA.
11. Run post-deploy integrity test against live URL:
   - check expected headers
   - check artifact digest matches built digest

## Repository Policy Guardrails
1. Pre-commit and CI checks must fail on:
   - `rehype-raw` usage in runtime components
   - runtime remote fetches for authored content
   - unpinned toolchain entries (`latest`, caret ranges in protected lists)
   - non-allowlisted external URLs in content files
2. Require PR approval for changes to:
   - build scripts
   - devcontainer config
   - CI workflows
   - dependency lockfile

## Practical Guarantee Statement
With the above model, you cannot guarantee global network behavior absolutely, but you can guarantee this strong property:

A visitor receives bytes that are traceable to a single immutable build artifact produced from a pinned toolchain and versioned content inputs, with no runtime-authoring dependency on mutable third-party content.

## Migration Sequence (Recommended)
1. Remove runtime remote content fetches and freeze content at build.
2. Remove `rehype-raw` from runtime rendering.
3. Pin Node/npm/devcontainer and lock dependency policy.
4. Add checksum + SBOM + immutable SHA deploy flow.
5. Enforce CI guardrails and policy checks.

## Purely Typed Methodological Approach (Appendix)

Follow these rules without exception to keep authored content and runtime behavior type-closed and reviewable.

1. TypeScript strictness is mandatory:
   - `"strict": true`
   - `"noUncheckedIndexedAccess": true`
   - `"exactOptionalPropertyTypes": true`
   - `"noImplicitOverride": true`
   - `"useUnknownInCatchVariables": true`
2. All content crossing boundaries must be `unknown` first, then decoded by schema.
3. No `any` in application, build, or generator code.
4. No type assertions from untrusted input except inside dedicated decoder modules.
5. Every decoder returns a discriminated union (`{ ok: true, value } | { ok: false, issues }`).

### Typed Content Workflow
1. Content files are treated as data, never executable templates.
2. Each content file has a schema and version field (`schemaVersion: 1`).
3. Build fails if schema version is unknown or if additional properties appear.
4. Deterministic normalization step sorts object keys and arrays where order is non-semantic.
5. Generator writes both normalized payload and its digest metadata.

### Typed URL and HTML Policy
1. Use branded nominal types for URLs (`TrustedHttpsUrl`, `InternalPath`, `AssetPath`).
2. Construction allowed only through validators.
3. Rendering accepts only validated branded URL types.
4. Markdown pipeline outputs sanitized AST only; no runtime raw HTML admission.
5. Inline HTML requirement must be represented by a typed safe fragment enum generated at build-time.

### Typed Configuration Policy
1. All env vars parsed by a single config loader (`src/config/runtimeConfig.ts`).
2. Loader outputs immutable typed object (`Readonly<RuntimeConfig>`).
3. Missing or malformed required config is a startup/build error, never silent fallback.
4. Optional config must have explicit default values in one place.

### Phase 1
1. Point 1: Add exact Node version to `.nvmrc`.
2. Point 1: Add exact `engines.node` and `packageManager` versions to `package.json`.
3. Point 1: Replace `latest` tags in devcontainer with pinned versions.
4. Point 2: Enforce `npm ci` in CI for deterministic installs.

### Phase 2
5. Point 2: Add CI lockfile drift check.
6. Point 2: Add strict security headers in hosting config (CSP, nosniff, referrer policy).
7. Point 3: Add typed runtime config loader and disallow direct env reads in components.
8. Point 3: Add branded URL validators (`TrustedHttpsUrl`, `InternalPath`, `AssetPath`).

### Phase 3
9. Point 3: Add schema validation for all authored content files in prebuild.
10. Point 4: Remove runtime `rehype-raw` usage and keep sanitize-only markdown rendering.
11. Point 4: Add CI rule banning runtime remote authored-content fetches.
12. Point 5: Generate and store artifact checksums (`dist/checksums.txt`) per build.

### Phase 4
13. Point 5: Emit typed build metadata JSON and validate it in CI before deploy.
14. Point 6: Generate SBOM for each release and publish with artifact metadata.
15. Point 6: Refactor route metadata to a single typed source and generate sitemap/meta from it.

### Optional
16. Point 7: Introduce typed boundary decoder modules for network/filesystem/user input paths.
17. Point 8: Move authored blog/music content to build-time freeze pipeline with strict schemas.
18. Point 10: Implement full immutable SHA-addressed deployment flow with atomic pointer switching, rollback pointers, provenance verification, and post-deploy digest attestation.
