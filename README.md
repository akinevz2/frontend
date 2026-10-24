# kine's website

[![CI/CD Security Pipeline](https://github.com/akinevz2/frontend/actions/workflows/ci.yml/badge.svg)](https://github.com/akinevz2/frontend/actions/workflows/ci.yml)
[![Security](https://img.shields.io/badge/security-maintained-green.svg)](./SECURITY.md)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.19.2-brightgreen.svg)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-CC--BY--NC--ND--4.0-lightgrey.svg)](./LICENSE)
[![Website CI](https://github.com/akinevz2/frontend/actions/workflows/ci.yml/badge.svg)](https://github.com/akinevz2/frontend/actions/workflows/ci.yml)

This is the source code for my personal website. I built it as a landing page for myself, and as a point-of-interest for those that stumble upon it.

This code shows who I am, what I am building, and the things I care about in software.

The design is very human. The code is built with modern tooling so I can keep iterating quickly.

## Why this exists

This repo is where I experiment with:

- Personal storytelling through UI
- JSON-driven content that is easy to edit
- Small interactive features (windows, modals, media embeds)
- A workflow that is simple enough to maintain long-term

## Tech stack

- React + TypeScript
- ~~Astro~~
- Vite for development and builds
- xp.css for the nostalgia

### xp.css notes

`xp.css` is the `xp.css` git submodule (the [akinevz2/XP.css](https://github.com/akinevz2/XP.css) fork, branch
`build-system-modernization`), not the npm package. Its `dist/` bundles are gitignored and produced by
`node build.js` inside the submodule, so before `vite build` you need:

```
git submodule update --init xp.css && npm --prefix xp.css install --no-audit --no-fund && npm --prefix xp.css run build
```

`vite.config.ts` resolves the bare `xp.css/...` import specifiers to the submodule via `resolve.alias`. When the
fork merges `build-system-modernization` into `main`, repoint `.gitmodules` (`branch = build-system-modernization`
→ `branch = main` or simply drop the `branch` line), then `git submodule update --remote` and commit the new submodule SHA.

## Local development

Start the dev server:

```
npm run dev
```

Build for production:

```
npm run build
```

`npm run build:local` runs the full pre-push pipeline locally — the same
checks CI ("Website CI") runs on main: lockfile STABLE, the gated build
(vite build + checksums + drift report), and the drift-policy gate, plus
lint/tests/audit. `npm run check:ci` runs just the CI-equivalent subset
(lockfile + gated build + drift policy) without the content refresh.

`npm run build` is the deploy build (Render): vite build only — no
checksums pass, no content regeneration — so host rebuilds stay cheap.
`npm run build:gated` is `build` plus the checksums/drift-report pass and
is what CI and `build:local` run. The drift-policy gate
(`npm run verify:policy`) is a pure static check of the committed drift
report, so the Render deploy runs it before installing anything and
fails fast when the uploaded build doesn't pass.

Content snapshots that mirror live services (`src/content/soundcloud.json`)
are regenerated only by `npm run refresh:soundcloud`, which runs inside
`build:local` — never by `npm run build`. Deploy-side builds (Render)
ship the committed snapshot and manifest exactly as `build:local`
produced them.

Run linting:

```
npm run lint
```

Dependency audit:

```
npm run check:audit
```

Drift gate (CI runs this after every build; fails on genuine drift of
non-mutable artifacts vs the live deployment, after reconciling Vite
rebuild noise — rehashed bundle references and stale-baseline entries —
against the live site):

```
npm run verify:policy
```

## Contact

If you are here to learn more about me professionally, the website includes my resume and contact details.

Thanks for visiting.
