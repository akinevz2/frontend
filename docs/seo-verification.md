# SEO prerender — verification evidence (phase 4)

Environment: branch `seo-prerender`, local machine. The preview server
(`npm run preview`, 127.0.0.1:8086) served `dist/` from
`npm run build:gated`.

## 1. Gates

```
$ npm run build:gated            # vite build + snapshot rendering + checksums
...
274. [CHANGED] resume/index.html (generated)
276. [CHANGED] sitemap.html (generated)
277. [CHANGED] sitemap.xml (generated)
278. [CHANGED] sitemap/index.html (generated)
283. [CHANGED] wow.html (generated)
284. [CHANGED] wow/index.html (generated)
Wrote 285 checksums to /home/kine/development/personal/website/dist/checksums.txt
                and to /home/kine/development/personal/website/public/checksums.txt
Baseline: https://akinevz.com/checksums.txt
```

Every changed page is marked `(generated)` = auto-mutable via
`dist/.generated.json`; no hand-edited checksums.

```
$ npm run verify:policy
Drift policy PASS — 0 violation(s) vs https://akinevz.com/checksums.txt
  rebuild noise reconciled against live: 0 rehash-only, 0 live-match (not drift)
Report generated at 2026-11-21T12:08:50.023Z
```

```
$ npm run typecheck   # clean
$ npm test            # pass 94 / fail 0 (includes test/seo-snapshot.test.js
                      #  and test/seo-meta.test.js)
$ npm run lint        # prettier/eslint clean, no foreign files touched
```

## 2. Raw curl over every generated + sitemap page

Script: fetches all 136 `*.html` entries of `dist/.generated.json` and
all 53 `<loc>` urls of `dist/sitemap.xml` over `http://127.0.0.1:8086/`
(full script preserved in the session transcript), then per page checks:

- exactly one `<h1>`, one `<title>`, one `rel="canonical"`, one
  `name="description"` (alias pages are exempt: they are redirects and
  intentionally carry no snapshot);
- exactly one `<main data-seo-snapshot>`; **no `<iframe>` anywhere**;
- every `<script type="application/ld+json">` parses with `JSON.parse`;
- every sitemap URL serves HTTP 200 and maps to a manifest path.

Literal result:

```
pages checked: 136, sitemap urls: 53
problems: 1
PROBLEM: sitemap /blog/archive/noise/%D1%80%D1%83%D0%BD%D0%B8%D1%81%D1%87-%D0%B3%D0%BB%D0%BE%D1%81%D1%81%D0%B0%D1%80%D0%B8%D0%B9 not in manifest
```

The single "problem" is a script artifact: the verifier maps the
percent-encoded sitemap loc onto a UTF-8 filename. Verified directly:

```
$ ls "dist/blog/archive/noise/" | grep глоссарий
рунисч-глоссарий
рунисч-глоссарий.html
рунисч-глоссарий.md
$ curl -s -o /dev/null -w "%{http_code}\n" \
  "http://127.0.0.1:8086/blog/archive/noise/%D1%80%D1%83%D0%BD%D0%B8%D1%81%D1%87-%D0%B3%D0%BB%D0%BE%D1%81%D1%81%D0%B0%D1%80%D0%B8%D0%B9"
200
```

### Deep-collapsed content in the raw html (2 distinctive sentences per page)

The verifier prints, for every one of the 136 pages, the two longest
sentences found inside `<main data-seo-snapshot>` (108 pages carry a
snapshot; the 28 alias/redirect pages do not). Full output retained in
the session; samples — all of these live inside windows the interactive
app keeps COLLAPSED until OK/link:

```
## wow.html            (form-gated-adjacent, collapsed sections)
  - WoWUp addon lists Import WoWUp WoW Forever addons list status: available
    WoWUp WoW Forever import string.
  - Import WoWUp WoW Classic addons list status: available WoWUp WoW Classic
    import string.

## music.html          (collapsed SoundCloud track windows)
  - Not the EQ.w3m on SoundCloud Track: They Were Laid to Rest ... on SoundCloud
  - Discography Total Generated: 11/9/2026, 8:23:40 PM This total measures main
    and alt profiles as of uploading.

## projects/on-deploy.html
  - stable in v1.4.x status: v1.4.2 version probing reads the package manager
    (dpkg-query, pacman) instead of spawning the binary ...
  - snapshot - collect a machine's pre-existing config into doftiles' defaults/
    (a stow-shaped package) before the first deploy overwrites it ...

## projects/got-source.html   (include-expanded blog release inside the project)
  - get Usage We begin in /home/kine/development and execute get to get the
    contents of the current directory ...
  - Implementation get is implemented as a bash function (for cd support),
    backed by got — the POSIX-sh script holding all the logic ...

## blog/archive/sophus-lie.html  (.json post page)
  - This is highly relevant in coupled heat and mass transfer (such as the
    Soret and Dufour effects), where temperature gradients drive mass flux ...
  - Lie Symmetries and the Heat-Mass Transport Homeomorphism ...

## blog/random/hlwm.html        (.md post page)
  - The video shows the window manager reacting to live commands while the
    agent narrates what it is doing.

## index.html
  - presentation slides here and cats, above all creatures open source public
    live projects : my github projects here ...
  - current hobbies gaming, programming, music current status hapax proxima
    search what's kine busy with recently: graduated University of Sussex!
```

## 3. Singletons and JSON-LD (spot checks over curl)

```
$ grep -c "<url>" dist/sitemap.xml
53
$ curl -s http://127.0.0.1:8086/ | grep -o 'property="og:image:width" content="[^"]*'
property="og:image:width" content="123          # real avatar.png IHDR (123x121)
$ curl -s http://127.0.0.1:8086/ | grep -o '<script type="application/ld+json"[^>]*>.\{0,80\}'
<script type="application/ld+json" data-route-meta="jsonld">{"@context":"https://schema.org","@type":"Person","name":"Kirill Nevzorov","url"
$ curl -s http://127.0.0.1:8086/projects/pagerts | grep -o 'ld+json">.\{0,60\}'
{"@context":"https://schema.org","@type":"SoftwareSourceCode",
$ curl -s http://127.0.0.1:8086/contact | grep -c 'ld+json'
0                                               # non-entity routes: none
$ curl -s http://127.0.0.1:8086/projects/on-deploy | grep -o 'name="description" content="[^"]*"'
name="description" content="the doftiles deployment orchestrator: verifies the
WM-stack binaries, installs the missing ones through per-distro deploy scripts,
runs the make install…"     # 295-char copy truncated at a word boundary + …
```

## 4. JS-on boot (real browser, chrome-headless-shell)

jsdom cannot execute ES-module scripts, so the boot check drives the
playwright-cached `chrome-headless-shell` binary over CDP with node's
built-in WebSocket (`test/seo-boot.manual.mjs`; manual tool, not part of
`npm test` — it needs a running preview server and the local chrome
binary). **This is a full browser: layout and interaction are real** —
unlike jsdom, which was therefore not used for this step.

`/` (JS on):

```
page state: {
 "windows": 7,
 "titleBars": ["Welcome to kine's website!", "for guru wisdom, there's tao of vim", "what is kine"],
 "snapshotStillThere": false,          # createRoot replaced the snapshot
 "okButtons": 5,
 "ariaBefore": { "expanded": "false", "controls": "0.1" },
 "title": "home of kine"
}
after click (OK on window 0.1):
 "windowStillThere": true,
 "windowText": "what is kineits my namewhy is kine?OK",
 "windowChildren": 1,
 "okButtonGoneWhenExpanded": true      # pre-existing behaviour: expanded
                                       # link-less windows unmount their OK
console/log entries: 0                 # no errors, no warnings, no exceptions
```

The revealed text is byte-identical to the snapshot's `id="0.1"` section
served in the raw html:

```
$ curl -s http://127.0.0.1:8086/ | grep -o 'id="0.1">.\{0,120\}'
id="0.1">what is kine</h2><ul><li><p>its my name</p></li><li><h3 id="0.1.0">why is kine?</h3>...
```

`/projects/got-source` (JS on): 6 windows, title bar
"get - fast cd+ls workflow for folders…", snapshot replaced,
**console/log entries: 0**.

`/blog/random/hlwm` (JS on): BlogPostPage resolves the extension-less
URL, title "hlwm | blog of kine", snapshot replaced, app errors 0. The
only 3 console lines are browser-level, not the app: a pre-existing
YouTube iframe `allow` attribute note (`Unrecognized feature:
'web-share'`) and chromium's software-WebGL deprecation notices.

Pre-boot paint: with JS on, the page first paints the plain snapshot
(readable text, minimal system-ui styling), then the app replaces it
with the xp window layout. The swap is a full re-render — brief flash of
unstyled-by-98.css content before the XP chrome appears. NOT hidden with
`display:none` (per instruction); judged mildly jarring for a
fraction of a second on first paint only.
