# kine's website

[![CI/CD Security Pipeline](https://github.com/akinevz2/frontend/actions/workflows/ci.yml/badge.svg)](https://github.com/akinevz2/frontend/actions/workflows/ci.yml)
[![Security](https://img.shields.io/badge/security-maintained-green.svg)](./SECURITY.md)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.19.2-brightgreen.svg)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-Creative%20Commons-lightgrey.svg)](https://creativecommons.org/)

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

## Local development

Start the dev server:

```
npm run dev
```

Build for production:

```
npm run build
```

Run linting:

```
npm run lint
```

Dependency audit:

```
npm run check:audit
```

## Notes

Most content is managed through JSON, rendered into components in the browser.

This keeps content updates straightforward while still allowing rich UI behavior.

Some pages rely on raw github user content to serve the json so that a full website-rebuild is not necessary for updating content on those pages, such as blog.

## Contact

If you are here to learn more about me professionally, the website includes my resume and contact details.

Thanks for visiting.
