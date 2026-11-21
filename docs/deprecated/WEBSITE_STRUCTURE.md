# Website Structure Documentation

This document explains how the personal website is structured and how to add new pages.

## Architecture Overview

The website is a React + TypeScript single-page application built with Vite. It uses JSON-driven content for easy editing and follows a modular page-based architecture.

## Key Files and Directories

### Configuration Files

- `pages.json` - Master route configuration. Defines all available pages with their paths, menu labels, titles, and descriptions.
- `sections.json` - Content for the home page sections. Contains markdown-like content with headings, links, and nested structures.
- `addons.json` - Content for the addons page. Defines WoW addon configurations with download links and descriptions.

### Source Code

```
src/
├── App.tsx              # Main application with routing logic and page switching
├── pages/
│   ├── index.ts         # Page component exports
│   ├── HomePage.tsx     # Home page component
│   ├── AddonsPage.tsx   # Addons page component (and example of content-driven page)
│   ├── ContactPage.tsx  # Contact page
│   ├── ResumePage.tsx   # Resume page
│   ├── WowPage.tsx      # WoW configs page
│   └── NotFoundPage.tsx # 404 page
├── components/
│   ├── Page.tsx         # Page wrapper components (PageContent, PageWithAddons)
│   ├── MenuBar.tsx      # Navigation menu
│   ├── Addon.tsx        # Addon item component
│   ├── Section.tsx      # Section content component (in windowing/)
│   └── ...              
├── windowing/
│   ├── types.ts         # TypeScript type definitions
│   ├── utils.ts         # Content processing utilities
│   └── Section.tsx      # Core section rendering
├── lib/
│   └── ...              # Utility libraries
└── utils/
    └── ...              # React hooks and utilities
```

### Public Content

```
public/
├── blog/               # Blog posts (markdown files)
├── documents/          # Downloadable documents
└── images/             # Static images
```

## Adding a New Page

### Step 1: Create the Route Configuration

Add a new entry to `pages.json`:

```json
{
  "path": "/pagerts",
  "menuLabel": "pagerts",
  "title": "pagerts - Page Router",
  "description": "A TypeScript page routing library by kine"
}
```

### Step 2: Create the Page Component

Create a new file `src/pages/PagertsPage.tsx` based on `AddonsPage.tsx` or `HomePage.tsx`:

**For content-driven pages (like home/addons):**

```tsx
import { useMemo } from "react";
import { PageContent } from "../components/Page";
import { processContent } from "../windowing/utils.ts";
import type { SectionProps } from "../windowing";

const PagertsPage = () => {
  const { processed, metadata } = useMemo(
    () => processContent(sections as SectionProps),
    [],
  );

  return (
    <main>
      <PageContent sections={processed} pageMetadata={{ sections: metadata }} />
    </main>
  );
};

export default PagertsPage;
```

**For addon-style pages (like addons):**

```tsx
import { useMemo } from "react";
import { PageWithAddons } from "../components/Page";
import { processContent } from "../windowing/utils.ts";
import type { AddonProps } from "../components/Addon";

const PagertsPage = () => {
  const { processed, metadata } = useMemo(
    () => processContent(content as AddonProps),
    [],
  );

  return (
    <main>
      <PageWithAddons
        addons={processed as AddonProps}
        pageMetadata={{ sections: metadata }}
      />
    </main>
  );
};

export default PagertsPage;
```

### Step 3: Export the Page Component

Update `src/pages/index.ts`:

```typescript
export { default as PagertsPage } from "./PagertsPage";
```

### Step 4: Add the Route to App.tsx

Import and add the route in `src/App.tsx`:

```tsx
import {
  // ... existing imports
  PagertsPage,
} from "./pages";

// Add to the switch statement:
case "/pagerts":
  content = <PagertsPage />;
  break;
```

### Step 5: Create Content File

Create a JSON file (e.g., `pagerts.json`) with your content in the same format as `sections.json`:

```json
{
  "heading": "Welcome to pagerts",
  "content": [
    "pagerts is a simple page routing library",
    {
      "heading": "Features",
      "content": [
        "Type-safe routing",
        "Nested routes support",
        "Easy integration"
      ]
    }
  ]
}
```

## Content Processing Pipeline

The website uses `processContent()` from `src/windowing/utils.ts` to:

1. Validate content links
2. Assign UUIDs to all content items
3. Generate stable tree-index paths for permalink anchors

## Page Types

| Page Type | Component Pattern | Use Case |
|-----------|-------------------|----------|
| `PageContent` | Section-based | Home page, blog posts |
| `PageWithAddons` | Addon-based | Addons page, Wow page |
| Direct component | Custom | Contact, Music, Sitemap |

## Key Dependencies

- **React**: UI components and state management
- **Vite**: Build tool and dev server
- **xp.css**: Nostalgic CSS framework
- **react-markdown**: Blog content rendering

## Deploying to Render.com

The website is deployed to Render.com as a static site. The `render.yaml` file configures the build and routing.

### Domain Configuration

To add a subdomain redirect (e.g., `pagerts.akinevz.com` → `akinevz.com/pagerts`):

1. **Add Custom Domain in Render Dashboard:**
   - Go to your service → Settings → Custom Domains
   - Add `pagerts.akinevz.com`
   - Render will provide DNS verification records

2. **Configure DNS:**
   - Add a CNAME record for `pagerts` pointing to your Render service domain
   - Example: `pagerts.akinevz.com` → `alias.kirill-nevzorov.onrender.com`

3. **Path-based routing:**
   - The website handles `/pagerts` route internally
   - Visitors to `pagerts.akinevz.com` will load the homepage at `/`
   - For specific redirects, configure via Render's domain aliases

### Current Routes

The render.yaml defines:
- `/404` → `/404.html` (static 404 page)

## Easter Egg: The `#feef69` Page

Navigate to `/#feef69` (note the hash) for a hidden easter egg:

- An empty page with background color `#FEEF69` (the same yellow as Clippy's border flash)
- Clippy remains visible if it was showing (it's the website's border flash color!)
- No menu bar - just pure yellow

This is a fun homage to the Clippy mascot that watches over the site.