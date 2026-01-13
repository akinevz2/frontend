# GitHub Copilot Instructions

## Project Overview
Personal website built with **Astro 5 + React 19**, using a JSON-to-HTML transformation architecture with Windows XP aesthetic (xp.css). The site features a fixed Windows XP-style menu bar at the top of every page and renders nested, interactive "window" components styled as Windows 98/XP UI elements.

## Core Architecture Pattern: JSON → Components → Astro

### Content Declaration (JSON-first)
- **Home page**: `src/sections.json` - nested sections with heading/content structure
- **Addons page**: `src/addons.json` - addon listings with status, links, and descriptions
- JSON structure supports recursive nesting: strings, arrays, or nested objects with `heading`/`content`

### Component Hierarchy
```
Astro Pages (.astro)
  ├─ Load JSON (sections.json / addons.json)
  ├─ Pass to React components with client:load
  └─ React Components (.tsx)
      ├─ Section.tsx - renders nested sections as XP windows
      ├─ Addon.tsx - renders addons with copy-to-clipboard
      ├─ Page.tsx - orchestrates Section/Addon arrays
      └─ SectionProvider - manages localStorage state
```

**Critical**: `.astro` files are server-rendered; use `client:load` for React interactivity.

## Component-Specific Patterns

### MenuBar Component (`src/components/MenuBar.astro`)
- **Fixed position**: Always visible at top of every page (Windows XP menu bar style)
- **Auto-discovery**: Automatically finds all `.astro` pages in `src/pages/` via `Astro.glob()`
- **Custom links**: Use `additionalLinks` prop to add non-page links (PDFs, external URLs)
- **Manual override**: Pass `links` prop to manually specify all menu items
- **Label mapping**: Default labels defined in `src/utils/menuItems.ts` (home → '/', addons → '/addons/', etc.)
- **Keyboard shortcuts**: Each menu item's first letter is underlined and acts as keyboard shortcut
- **Styling**: Uses gradient background (`#f0f0f0` to `#e0e0e0`) with subtle shadow
- **Pattern**: Must be placed first in `<body>` tag before other content
- **Accessibility**: Uses proper ARIA roles (`menubar`, `menuitem`)
- **Mobile**: Horizontal scrolling on small screens with touch-friendly targets

### Section Component (`src/components/Section.tsx`)
- **Recursive rendering**: `content` can contain more `SectionProps` objects
- **Collapse/expand state**: First render shows "OK" button; tracks expansion in localStorage via `SectionContext`
- **Window controls**: Minimize (no-op), Maximize (modal overlay if `depth > 0`), Close (plays sound)
- **Sound effect**: `playSound()` loads `/crunchy_kick.ogg` on close

### Addon Component (`src/components/Addon.tsx`)
- Extends `SectionProps` with `status`, `text`, `link` fields
- `CopyToClipboardButton` uses `navigator.clipboard` + `react-toastify`
- Supports same window-style UI as Section

### Page Component (`src/components/Page.tsx`)
- `PageContent`: Wraps sections in `SectionProvider` for context
- `PageWithAddons`: Similar but for addons, no provider needed

## Development Workflow

### Local Development
```bash
npm run dev          # Starts on port 8086 (see astro.config.mjs)
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

**Dev container note**: Uses polling for file watching (see `vite.server.watch.usePolling` in astro.config.mjs) - necessary for containerized environments.

### Port Configuration
- Default: `8086` (configured in astro.config.mjs)
- Host: `true` (accessible from outside container)

## Styling Guidelines

### XP.css Integration
- External CDN: `https://unpkg.com/xp.css@0.2.3/dist/98.css`
- **Loading pattern**: All pages wait for xp.css to load before showing content (see `DOMContentLoaded` script in pages)
- Load state class: `styles-loaded` added to `<body>` when ready

### Custom Overrides (`src/styles/main.css`)
- Menu bar styles: Fixed position at top, XP-style gradient background
- Remove window borders on top-level `.page > .window` (avoid double borders)
- Title bar text forced to `#eee` for readability
- Body padding-top: `24px` (accounts for fixed menu bar height)
- CSS variables: `--background-color`, `--border-size`, `--gap-size`
- **Mobile responsive**: Menu bar scrolls horizontally on screens ≤768px with larger touch targets

**Pattern**: Never override xp.css directly; use higher-specificity selectors or `!important` sparingly.

## State Management

### SectionContext (`src/components/SectionContext.tsx`)
- Tracks expanded sections via `Set<string>`
- Persists "what is kine" expansion to localStorage key `expandedWhatIsKine`
- **Usage**: Wrap components in `<SectionProvider>`, access via `useSectionContext()`

## File Conventions

### Static Assets
- Addons text files: `public/addons/*.txt` (referenced as `/addons/filename.txt`)
- Audio: `public/*.ogg` files for UI sounds
- Images: `public/*.png` for metadata (og:image)

### TypeScript
- Strict mode enabled (`astro/tsconfigs/strict`)
- JSX: `react-jsx` with `jsxImportSource: "react"`
- Type exports: Use `type` keyword (`export type SectionProps`)

## Key Dependencies

- **Astro**: 5.x - use Astro pages for routes, React for interactivity
- **React**: 19.x - use `client:load` directive in Astro files
- **xp.css**: 0.2.6 (npm) + 0.2.3 (CDN) - Windows XP styling
- **react-toastify**: Clipboard notifications

## Common Tasks

### Adding a new page
1. Create `.astro` file in `src/pages/` (auto-routes)
2. Import content, styles
3. Include xp.css load script
4. Add `<MenuBar />` first in `<body>` (auto-discovers pages)
5. Use `client:load` for React components
6. **Optional**: Update `src/utils/menuItems.ts` to customize label and order

### Adding content
- **Home page**: Edit `src/sections.json`
- **Addons page**: Edit `src/addons.json`, add text file to `public/addons/`

### Modifying window behavior
- Sound effects: Update `playSound()` in Section.tsx/Addon.tsx
- Window controls logic: See `handleMaximize`, `handleClose`, `handleExpand`
