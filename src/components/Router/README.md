# Custom React Router v6 Setup

## Overview

This custom React Router implementation provides specialized routing capabilities for the website, including:

- **Hash navigation** for section-based routing
- **URL normalization** (remove .html, index.html, trailing slashes)
- **Custom Link behavior** with internal/external link handling
- **Preloading** for media assets
- **History state preservation** for auto-expand sections
- **UUID-based routing** for random blog posts
- **Dynamic projects routing** from JSON files

## Components

### Router.tsx
Main router component using `BrowserRouter` with custom route normalization.

### Link.tsx
Custom Link component that:
- Preserves hashes for section navigation
- Handles external links (opens in new tab)
- Uses `pushState` for navigation instead of default router behavior

### LinkProvider.tsx
Provides routing context with:
- `pushState(url, hash?)` - Navigate using pushState
- `isExternal(href)` - Check if link is external

### usePreload.ts
Hook for preloading media assets:
- `preload({ images, audio, video, sections })` - Preload specific media
- `preloadPage()` - Preload page-related assets
- `preloadSection(sectionId)` - Preload section content

### HistoryProvider.tsx
Preserves navigation state in browser history:
- Scroll position preservation
- Expanded sections tracking
- Metadata storage
- `scrollToPosition()`, `toggleSection()`, `setMetadata()`

### ProjectsRoute.tsx
Dynamic route handler for `/projects/<project-name>/`:
- Loads projects from `/src/pages/projects/*.json`
- Renders project details with images and content

## Usage

```tsx
import { usePreload, useHistoryState } from './components/Router';
import { LinkProvider } from './components/Router';

function App() {
  const { preloadPage } = usePreload();
  const { state, scrollToPosition, toggleSection } = useHistoryState();

  useEffect(() => {
    preloadPage();
  }, [preloadPage]);

  return (
    <LinkProvider>
      <Router>
        <Routes>
          <Route path="/" element={<PageSpace />} />
          <Route path="/projects/*" element={<PageSpace />} />
          <Route path="/blog/random/*" element={<PageSpace />} />
          <Route path="/404" element={<NotFoundPage />} />
        </Routes>
      </Router>
    </LinkProvider>
  );
}
```

## Routing Patterns

### Home
```
/ → <PageSpace page="home" />
```

### Projects
```
/projects/<project-name>/ → Loads /src/pages/projects/<project-name>.json
```

### Blog Random
```
/blog/random/<uuid>/ → Uses UUID to load from /public/blog/random/<uuid>.md
```

### Not Found
```
/404 → <NotFoundPage />
```

## URL Normalization

Automatic normalization removes:
- `.html` extensions
- `index.html` suffixes
- Trailing slashes

Example: `/projects/my-project/` becomes `/projects/my-project`

## History State

Navigation state is preserved in browser history:
- Scroll position restored on back navigation
- Expanded sections tracked across history
- Metadata stored for page-specific data