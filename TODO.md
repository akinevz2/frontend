# Project Tasks

## In Progress
- [ ] Extract assistant/conversation system components
  - [x] AssistantConversationModal.tsx - Created
  - [x] AssistantResponseWindow.tsx - Created
  - [x] useAssistantConversationState.ts - Created
  - [x] assistant/index.ts - Created
  - [x] App.tsx reduced from 1448 → 445 lines

- [ ] Extract route normalization and hash management system
  - [x] Create src/utils/routeNormalization.ts - Created (123 lines)
  - [x] Create src/hooks/useRouteHash.ts - Created (209 lines)
  - [x] Updated src/App.tsx with imports and TODO comments
  - [x] App.tsx reduced from 1448 → 445 lines

## Priority 1 - High Impact Features

- [ ] Extract Theme Management System (lines 48-71, 73-80, 97-148 in App.tsx)
  - [ ] Create src/hooks/useThemeManagement.ts
    - [ ] Read persisted theme name from cookie
    - [ ] Set and switch between themes (default, border-flash, lilac)
    - [ ] Handle theme persistence with lightdni-jssas-toggle
  - [ ] Create src/utils/themeEngine.ts
    - [ ] Border flash theme trigger
    - [ ] Theme restoration after flash
  - [ ] Reduce App.tsx by ~100 lines

- [ ] Extract Dev Window System (lines 32-36, 210-231)
  - [ ] Create src/hooks/useDevWindow.ts
    - [ ] Manage dev window iframe loading
    - [ ] Handle connection status checking
    - [ ] Manage fallback and redirect logic
    - [ ] Store devWindowRef ref
  - [ ] Reduce App.tsx by ~30 lines

## Priority 2 - Core Functionality

- [ ] Extract Admin Login Redirect System (lines 187-222)
  - [ ] Create src/hooks/useAdminProtection.ts
    - [ ] Manage admin login redirect timing
    - [ ] Implement unauthorized access detection
    - [ ] Handle redirect timeouts
  - [ ] Reduce App.tsx by ~40 lines

- [ ] Extract Page Content Router (lines 396-538)
  - [ ] Create src/components/PageRouter.tsx
    - [ ] Route-based content rendering
    - [ ] Handle different page cases (/, /addons, /blog, etc.)
    - [ ] Replace inline-coded page content sections
  - [ ] Reduce App.tsx by ~100 lines

- [ ] Extract Meta Tags Management (lines 165-185)
  - [ ] Create src/hooks/useMetaTags.ts
    - [ ] Update SEO meta tags dynamically
    - [ ] Handle canonical links
    - [ ] Manage social media sharing data
  - [ ] Reduce App.tsx by ~25 lines

## Priority 3 - Interactive Systems

- [ ] Extract Clippy Drag & Drop Utilities (lines 290-370)
  - [ ] Create src/utils/clippyDragDrop.ts
    - [ ] Ghost element creation
    - [ ] Drop target detection
    - [ ] Drag highlight management
    - [ ] Touch event handling
  - [ ] Reduce App.tsx by ~80 lines

- [ ] Extract Clippy Interactive Element System (lines 22-42, 258-270)
  - [ ] Create src/hooks/useClippy.ts
    - [ ] Clippy click handlers
    - [ ] Hold timer management
    - [ ] Theme flash trigger on interaction
    - [ ] Right-click context menu handling
  - [ ] Create src/utils/clippyInteraction.ts
    - [ ] Context menu flash effect
    - [ ] Assistant configuration fallback
  - [ ] Reduce App.tsx by ~100 lines

- [ ] Extract Context Menu Handler (lines 379-394)
  - [ ] Create src/hooks/useContextMenu.ts
    - [ ] Handle right-click events
    - [ ] Trigger flash effects
    - [ ] Call assistant configuration
  - [ ] Reduce App.tsx by ~15 lines

## Done
- [x] Move pages.json from root to src/pages/pages.json
- [x] Update import in src/App.tsx to './pages/pages.json'
- [x] Update import in src/components/SitemapContent.tsx to '../pages/pages.json'
- [x] Extract assistant/conversation system
- [x] Extract route normalization and hash management
- [x] Create src/utils/appConstants.ts with constants and helpers
- [x] Create src/components/index.ts for exports

## Next Steps
- [ ] Complete extracting all Priority 1 features (Theme, Dev Window)
- [ ] Implement stub components for extracted modules
- [ ] Remove all cruft from App.tsx
- [ ] Test that App.tsx remains functional after all extractions
- [ ] Final cleanup and verification