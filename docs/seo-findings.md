# SEO prerender — Phase 0 findings (read-only)

Branch: `seo-prerender`. Nothing outside this document was changed.

## 1. Verified facts ("what is already true")

### 1.1 Skeletons, sitemap, manifest — TRUE

- `build/routeSkeletonsPlugin.ts:44-92` — `routeSkeletonsPlugin()`'s
  `closeBundle` reads the built `dist/index.html` and rewrites it once per
  route: root `/` written back to `dist/index.html` (`:61-63`), every other
  route to `dist/<slug>/index.html` (`:66-68`) plus a `<slug>.html` sibling
  unless a hand-written `public/<slug>.html` wins (`:70-73`).
- Sitemap: `:76-80` writes `dist/sitemap.xml` via `generateSitemap(routes)`
  (`build/sitemap.ts:12-36`; hidden routes and `/404` excluded at
  `build/sitemap.ts:15`).
- Manifest: `:82-90` writes `dist/.generated.json` from
  `generatedPathsForRoutes()` (`:17-32`, exported pure for tests — see
  `test/route-skeletons.test.js`).
- Per-route `<head>` meta: `build/meta.ts:23-75` `withRouteMeta()` rewrites
  the `data-route-meta="…"` placeholder tags that exist in `index.html`
  (`:6-20` `replaceMeta()`). Driven by `build/routes.ts:63-66`
  `loadRoutes()` = `pages.json` entries + one route per
  `src/content/projects/*.json` (canonical `/projects/<slug>`, plus a
  hidden short-hand `/<slug>` alias when not taken, `:37-60`).

### 1.2 Empty body — TRUE (the actual problem)

- `index.html:80` (and therefore every emitted dist page):
  `<div id="root"></div>` — nothing else inside.
- `src/main.tsx:41-48` uses `createRoot(document.getElementById("root")!)`
  `.render(...)` — **not** `hydrateRoot`. So a client-side render replaces
  the entire subtree; there is no hydration to mismatch, which makes a
  static snapshot inside `#root` safe to inject.

### 1.3 Collapsed-window content gating — TRUE (load-bearing)

- `src/window/Window.tsx:87` — `const showContent = expanded ||
Boolean(node.link);`; `:96-98` — children render only when
  `{showContent && node.children.length > 0 && <Children …/>}`. A
  collapsed, link-less window never mounts its children.
- The permalink logic depends on this: `src/window/state.tsx:63-66`
  ("parent never mounts the target"), `:108`, `:336` ("a collapsed parent
  never mounts its target"). **Not changed** — the snapshot is a second,
  build-time-only render path, per the design decision.

### 1.4 robots.txt vs `?post=` — TRUE (see §6)

- `public/robots.txt:8` — `Disallow: /*?*`.
- `src/window/state.tsx:218-226` — blog permalinks are
  `<pathname>?post=<toSlug(heading)>` (mode `"post"` set by
  `src/pages/BlogPage.tsx` via `PageWindows permalinkMode="post"`). No
  content file links to any `?post=…` URL (grepped `src/content/**`):
  they only appear when a visitor copies the Permalink button's URL.

## 2. Content loading: node vs the browser

`src/content/index.ts` cannot be imported by plain node:

- `src/content/index.ts:161-164` — `import.meta.glob("./projects/*.json")`.
- `:3,4` — `virtual:project-mtimes` (`build/projectMtimesPlugin.ts`) and
  `virtual:content-includes` (`build/includesPlugin.ts:69-95`, a live fs
  walk of the public root `*.json` + `public/blog/releases/*.md`).
- `src/content/blogDirs.ts:1` — `virtual:blog-dirs`
  (`build/blogDirsPlugin.ts:76-97`, walk of `public/blog/`).
- JSON imports (`./pages.json` etc.) resolve fine in node, but the virtual
  modules and glob only exist inside Vite.

**Recommended: `createServer({ middlewareMode: true })` + `ssrLoadModule`.**

- Spin up one temporary Vite dev server in middleware mode from
  `build/routeSkeletonsPlugin.ts` (or a small `build/prerenderServer.ts`),
  with `configFile: false` and an inline plugin list reusing exactly the
  plugins the content loader needs: `blogDirsPlugin()`,
  `contentIncludesPlugin(PUBLIC)`, `projectMtimesPlugin(...)` and the same
  `resolve.alias` map as `vite.config.ts:18-27` (`@`→`src`,
  `@public`, `@content`, `xp.css`→submodule root).
- Then `server.ssrLoadModule("/src/seo/snapshot.tsx")` (and/or
  `/src/content/index.ts` directly) gives the content loader + renderer
  running in node with all virtuals resolved. One server per build, closed
  afterwards — no nested `build()`, no extra rollup pass, no network, no
  installs.
- Why not a nested `build({ build: { ssr: true } })`: it runs a second
  full Rollup pass (slower), writes an intermediate bundle to disk, and
  needs careful output handling to avoid polluting `dist/` (which would
  break the checksum drift gate, §5). `ssrLoadModule` transforms the
  module graph in-memory and reuses the existing plugin instances'
  semantics.
- Aliases confirmed: `@` and `xp.css` are declared in
  `vite.config.ts:19,25`; the snapshot path only imports `@/content`-tree
  modules and `@/lib/markdown`, and does **not** import `src/main.tsx` /
  `src/window/Window.tsx`, so `xp.css` is never even resolved — but the
  alias map is reused anyway so nothing can surprise us.
- Browser-globals risk at module load is nil for the snapshot path:
  `src/lib/markdown.tsx:10` imports `./clippy`, but `src/lib/clippy.ts`'
  top level only touches `sessionStorage` behind a
  `typeof sessionStorage !== "undefined"` guard (`clippy.ts:26-27`);
  listeners are attached in functions, not at import time.
  `src/lib/audio.ts` is not imported by markdown/markdown deps. (The
  interactive window components are _not_ loaded by the snapshot path at
  all.)

## 3. Window-child taxonomy and how each appears in the snapshot

Child kinds (discriminated union `src/window/model.ts:4-9`, built from
`Section` by `buildNode` `:41-80`; roots via `buildWindows` `:84-89`):

| kind           | source                                                                                              | snapshot rendering                                                                                                                                                                                                                                                                                                                                  |
| -------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `text`         | string items, coalesced into `{lines[]}` (`model.ts:45-48`)                                         | through the same `Md` pipeline (`src/lib/markdown.tsx`) → real `<a>`, `<img alt>`, `<ul>/<ol>`, tables; iframes suppressed (below)                                                                                                                                                                                                                  |
| `window`       | nested `Section` (`model.ts:60-64`)                                                                 | recursive: heading → `<h2>..<h6>` by depth (cap `<h6>`; the page's top heading is the single `<h1>`), then its children                                                                                                                                                                                                                             |
| `embed`        | `{title,url,provider?,backgroundImage?}` (`model.ts:58-59`; schema `src/content/schema.ts:6-11`)    | plain link: `<a href="{url}" rel="noopener">{title}</a>` — **never an iframe**. Interactive side renders `<iframe>` when `resolveEmbed()` matches (src/window/Embed.tsx:19-37) — none of the section-level `embed` fields exist in content JSON (grepped: zero `"embed"` in `src/content/**`; only `ResourceEmbed` fetch-embeds, which are runtime) |
| `banner`       | `{banner:{image,href,lines}}` (`model.ts:52-53`)                                                    | link with lines + the image's alt from the first line(s) — `<a href>` wrapping `<img alt>`/text                                                                                                                                                                                                                                                     |
| `element`      | `ReactElement` items (`model.ts:49-51`)                                                             | see below                                                                                                                                                                                                                                                                                                                                           |
| `include` refs | expanded at load time (`src/content/index.ts:124-159`); an unresolved one throws (`model.ts:53-57`) | not a snapshot concern: resolved trees arrive already expanded                                                                                                                                                                                                                                                                                      |

**`element` (ReactElement) children — full list of producers:**

- `src/pages/MusicPage.tsx` — `tracksTotal(total)` (an `<h3>` with the
  track count, `MusicPage.tsx:78-80`) injected into the "Discography
  Total" section's content (`:112`). Carries indexable text
  ("N tracks as of last website rebuild") and is a pure function of
  `soundcloud.json`, so the snapshot can reproduce it if the `/music`
  snapshot renders the same `buildMusic()` tree (it contains no
  hooks/signals/store access — it is a module-level pure builder; only
  `DebugBar` and the component body touch browser APIs).
- Everything else passes plain JSON shapes: `SitemapPage.tsx` (Section
  literals), `ProjectsPage.tsx` (`projectWindow` — Sections),
  `BlogDirPage.tsx` (`blogDirListing`), `WowPage.tsx` (the
  `DownloadForm` is passed as `PageWindows` _children_, not a content
  item, and is stateful/interactive — not snapshot material).
- Raw-HTML strings that become iframes inside `Md` (MusicPage
  `SPOTIFY_ARTISTS` iframe markup, `MusicPage.tsx:26-28`; YouTube links
  via `rehypeYoutubeEmbed`): in the snapshot the `Md` pipeline runs with
  an `iframe` component override that renders a plain link to the
  iframe's `src` (title + url), satisfying "no iframes in any snapshot"
  without touching the shared pipeline or `src/lib/*`.

## 4. Bespoke pages vs pure-JSON pages

Registry `src/pages/index.ts:18-33`; routes `src/content/pages.json`.

**Pure `PageWindows content=<json>` pages — fully coverable from data:**

- `/` HomePage — `sections.json` (HomePage.tsx is PageWindows + a client
  only side-effect that injects MusicGroup JSON-LD into `<head>`;
  the JSON-LD moves to build time in phase 3).
- `/contact` (contacts.json), `/addons` (addons.json), `/configs`
  (configs.json), `/blog` (blog.json), `/sitemap` (SitemapPage's
  Section literals — data-driven from `routes`), `/projects`
  (ProjectsPage — built from `projects` list), every `/projects/<slug>`
  (ProjectPage → project.content), every hidden alias route
  (same content, redirect).

**Bespoke React pages — snapshot covers data-driven parts only:**

- `/music` MusicPage — content is built in `buildMusic()` from
  soundcloud.json + music-ext.json + PROFILES constants; fully
  reproducible at build time **if** we call `buildMusic()`-equivalent
  code from the snapshot (no browser globals in the builder itself).
  `DebugBar` (portal) excluded — not content.
- `/wow` WowPage — the non-gated sections of addons.json render
  (`WowPage.tsx:22-30` filter). The "Full UI pack*" sections are
  intentionally form-gated and hidden from a plain visit. **Decision
  needed**: for the snapshot to stay uncloaked (constraint 3: "snapshot
  text must be text the interactive page can show"), the gated pack
  sections must be EXCLUDED from the /wow snapshot, matching the
  unverified interactive view. The form itself (username/date/verify)
  is interaction-only; the snapshot shows the surrounding copy.
- `/resume` ResumePage — bespoke JSX: a hand-built window with resume
  PDF/HTML links and a live `<iframe src="/resume.html">` preview.
  Snapshot: the heading + the PDF/HTML links (data-driven-ish), no
  iframe. Gap: the inline preview (which itself is a separate static
  page crawlable at `/resume.html` — hand-written in `public/`, wins
  over a generated sibling, `routeSkeletonsPlugin.ts:70-73`).
- `/404` NotFoundPage — hidden, not in sitemap; snapshot trivial (see
  §5 route set) or skipped.
- `BlogPostPage` / `BlogDirPage` — **not routes** in `loadRoutes()`
  (they address extension-less `/blog/**` URLs, resolved client-side;
  `build/blogDocumentsPlugin.ts:19-28` rewrites document requests to
  the SPA shell in dev/preview only). They are therefore NOT in
  sitemap.xml nor .generated.json, and phase 2's "every route" set does
  not include them. Snapshot coverage for blog posts is a real gap —
  see the report list (robots/`?post=` finding below for context).

## 5. The gate files (read before touching the build)

- `scripts/write-dist-checksums.mjs` — walks `dist/`, hashes every file,
  compares against the LIVE `https://akinevz.com/checksums.txt` baseline
  (fetched over the network; unreachable ⇒ treated as real drift unless
  the path is mutable). Requires: every non-mutable, non-STABLE artifact
  must match its live counterpart or be classified `rehash-only` /
  `live-match`. It reads `dist/.generated.json` and marks every listed
  path as **auto-mutable** (`isMutablePath` / `MUTABLE_PATH_SET` in
  `scripts/mutable-assets.mjs`) — that is how new/changed generated
  pages stay exempt from the drift gate. Writes
  `public/documents/drift-report.json` + `public/checksums.txt` +
  `dist/checksums.txt`.
  **Implication:** every file the snapshot feature adds to an emitted
  html is a byte change to files already listed in `.generated.json`
  (they are auto-mutable) — no manifest edits needed; but we must never
  hand-edit `public/checksums.txt` and never add files to `dist/` that
  aren't registered.
- `scripts/verify-policy.mjs` — CI drift gate; reads
  `public/documents/drift-report.json`, validates its shape (fails
  closed on corruption), fails on any violation entry whose resolution
  is not `rehash-only`/`live-match` (`:128-144`). Advisory-only in PRs
  with `--nonblocking`.

## 6. Blog / `?post=slug` / robots.txt finding (report only)

- Blog posts live as static files under `public/blog/**` (`1st.md`,
  `releases/*.md`, …) and are addressed in-app three ways:
  1. the curated `/blog` page (blog.json windows, permalinks
     `?post=<slug-heading>`, `state.tsx:218-226`);
  2. extension-less post URLs `/blog/<path>` (no extension) rendered by
     `BlogPostPage` embedding `<path>.md` (BlogPostPage.tsx:24-32);
  3. directory listings `/blog/archive`, `/blog/random`, … by
     `BlogDirPage`.
- Every post therefore has a crawlable **non-query** address
  (`/blog/releases/dotfiles_1_0_0.md` — the raw file is itself served
  and fully crawlable; the extension-less page address
  `/blog/releases/dotfiles_1_0_0` resolves to the same content through
  the SPA — on Render static hosting there is **no rewrite rule** in
  `render.yaml` mapping extension-less URLs to the shell (only the
  `/404 → /404.html` redirect), so the extension-less form's behavior
  in production depends on Render's default SPA fallback and is
  UNVERIFIED here).
- `robots.txt:8` `Disallow: /*?*` therefore hides only the `?post=…`
  permalink duplicates (and any query variants), **not** any content
  that lacks a non-query URL: raw `.md` post files are crawlable at
  their public paths. The `?post=` URLs are in-page heading permalinks
  (copied from the Permalink button), not canonical post addresses —
  disallowing them is arguably correct duplicate-URL hygiene, at the
  cost of crawlers never seeing those exact addresses. **No change
  made or proposed to the URL scheme; robots.txt stays as is.**
- Note: since blog post/directory pages are not `loadRoutes()` routes,
  neither the sitemap nor `.generated.json` lists them — their
  discoverability rides entirely on links from `/blog` (which the
  snapshot will make crawlable), and their own pages remain
  JS-only bodies. Listed as an incomplete-coverage item for phase 2.

## 7. Existing tests / gates relevant to this work

- `test/route-skeletons.test.js` asserts `generatedPathsForRoutes`
  output (pure function — safe to extend, tests updated alongside).
- `npm test` = `node --import tsx --test` (discovers `test/*.test.js`).
- `npm run lint` = `prettier --write "src/**/*.{ts,tsx}"` + eslint over
  `src` — **build/ files are NOT prettier-formatted by it** (only
  eslint on src); snapshot code under `src/seo/` will be formatted.
- `npm run build` = `vite build && npm run render` (echo).
- `npm run build:gated` = build + checksums (needs network for the live
  baseline; locally it classifies unreachable as drift — but all
  changed generated pages are auto-mutable, so this stays green as long
  as every new file is registered in `.generated.json`).

## 8. Answers to the design decision check

No concrete blocker found. `react-dom/server`'s `renderToStaticMarkup`
plus `react-markdown` (already installed) are enough; `Md` renders
client-agnostic markup. The `createRoot`-replaces-snapshot approach has
no hydration to fight. Only judgment calls surfaced (to review):

1. /wow gated "Full UI pack*" sections excluded from the snapshot
   (uncloaking rule) — confirm intended.
2. Blog post pages (`/blog/**`) stay outside the per-route snapshot
   (they aren't routes); only their links become crawlable via /blog.
3. /resume snapshot shows links, not the live iframe preview.
4. ReactElement children: only MusicPage's `<h3>` track total today; the
   snapshot renderer will handle the `element` kind by rendering it with
   `renderToStaticMarkup` (it is a plain `<h3>`; no store access), with
   a hard rule that bespoke pages must not embed store-dependent
   elements.
