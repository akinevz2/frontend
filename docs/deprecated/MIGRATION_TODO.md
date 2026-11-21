# Page.json Migration Todo

## Current State Analysis

### Location
- **Existing File**: `/home/kine/development/personal/website/pages.json`
- **Target Location**: `/home/kine/development/personal/website/src/config/pages/` (directory needs to be created)

### Pages Configured in pages.json
1. `/` - home of kine
2. `/resume` - please hire kine
3. `/addons` - wow addons
4. `/sitemap` - sitemap of kine's website
5. `/contact` - please contact kine
6. `/wow` - kind of work kine likes
7. `/pagerts` - pagerts - TypeScript Page Router
8. `/music` - glitchbox tracks
9. `/blog` - blog of kine
10. `/404` - not found (hidden)

### Files Importing pages.json
1. `src/App.tsx` - imports pages from "../pages.json"
2. `src/components/SitemapContent.tsx` - imports pages from "../../pages.json"
3. `src/components/MenuBar.tsx` - imports pages from "../../pages.json"

## Migration Tasks

### Phase 1: Setup
- [x] Locate page.json file in codebase
- [x] Check if it exists in src/pages/
- [ ] Create target directory: `src/config/pages/`
- [ ] Verify `pages.json` has all required page entries

### Phase 2: Configuration Migration
- [ ] Convert pages.json structure to RouteConfig format
- [ ] Add component references for each page
- [ ] Create MissingPage component stub if needed
- [ ] Handle page-specific components:
  - [ ] BlogContent component
  - [ ] MusicContent component
  - [ ] RandomBlogPage component
  - [ ] ConversationPage component
  - [ ] ContactPage component (verify exists)
  - [ ] WowPage component (verify exists)
  - [ ] PagertsPage component (verify exists)
  - [ ] AddonsPage component (verify exists)
  - [ ] ResumePage component (verify exists)
  - [ ] HomePage component (verify exists)
  - [ ] NotFoundPage component (verify exists)

### Phase 3: Import Updates
- [ ] Update `src/App.tsx` import path
- [ ] Update `src/components/SitemapContent.tsx` import path
- [ ] Update `src/components/MenuBar.tsx` import path

### Phase 4: Testing
- [ ] Verify all routes are accessible
- [ ] Check menu rendering
- [ ] Verify sitemap generation
- [ ] Ensure no broken imports
- [ ] Verify SEO metadata routing

## Current Route Structure in App.tsx

Looking at App.tsx section 15, the codebase already has route handling logic that needs to be integrated with the new pages.json configuration.

## Notes

- The current routing system uses `matcher.ts` to match routes
- Route configuration should include `path`, `title`, `description`, `component` (for full Route type)
- Hidden pages need to be properly filtered in rendering
- All pages should have SEO metadata for social sharing

## Files to Reference

### Existing Type Definitions
- `/home/kine/development/personal/website/src/routing/types/index.ts` - RouteConfig interface

### Existing Match Router
- `/home/kine/development/personal/website/src/routing/matcher.ts` - Route matching logic

### Existing Pages
- `/home/kine/development/personal/website/src/pages/*.tsx` - Page components
- `/home/kine/development/personal/website/src/pages/index.ts` - Export file