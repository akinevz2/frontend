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

## Priority 1 - Code Design  

- [ ] Update Website Architecture Design Document to match actual implementation
  - [x] Fix PageSpace component specification (currently empty stub)
  - [x] Update Content Window width from 800px to 768px
  - [x] Document actual z-index hierarchy (4-6 levels vs 2 levels)
  - [x] Document toast notification implementation (bottom-center, not top-right)
  - [x] Add Z-Index Layering System section
  - [x] Add Animation Duration Standards section
  - [x] Add Responsive Breakpoint Reference Table
  - [x] Document Theme Persistence Mechanism (CSS variables vs cookies)
  - [x] Document all Easter Egg implementations
  - [x] Update Components Mapping section
  - [x] Update Success Criteria to match actual behavior
  - [x] Document actual implementations and file locations
  - [x] Add technical constraints based on actual code

- [ ] Complete PageSpace Implementation
  - [ ] Remove empty stub from PageSpace.tsx
  - [ ] Integrate with content layout
  - [ ] Fix CSS positioning to work as scroll container
  - [ ] Test layout functionality

- [ ] Unify and Document Theme System
  - [ ] Document CSS variable theme approach
  - [ ] Remove cookie-based theme claims
  - [ ] Add theme wobble animation (0.6s)
  - [ ] Document Lilac theme cookie (wow-username-theme)

- [ ] Standardize Z-Index Usage
  - [ ] Identify all z-index usages throughout code
  - [ ] Create z-index reference table
  - [ ] Update Modal components to use consistent values
  - [ ] Test z-index layering

## Priority 2 - Essential Features (Before App.tsx Deletion)

- [ ] Integrate and Document Toast Notification System
  - [ ] Review current react-toastify implementation
  - [ ] Check styling consistency (main.css lines 853-865)
  - [ ] Ensure close button works properly
  - [ ] Document configuration and usage
  - [ ] Test auto-dismiss timing (2000ms)

- [ ] Complete LinkConfirmModal Component
  - [ ] Implement missing functionality
  - [ ] Add expected features based on design
  - [ ] Integrate with modal layer
  - [ ] Test modal behavior

- [ ] Document Easter Egg Systems
  - [ ] Create implementation index with file locations
  - [ ] Document all trigger methods
  - [ ] Add test cases for each system
  - [ ] Document animation timing (180ms)

- [ ] Verify Component Extraction Status
  - [ ] Check remaining App.tsx imports
  - [ ] Verify extracted modules work independently
  - [ ] Identify inline code sections
  - [ ] Create dependency map

- [ ] Test Full Component Integration
  - [ ] Test layout rendering and responsiveness
  - [ ] Test modal interactions and animations
  - [ ] Test notification flow and dismissal
  - [ ] Test theme switching functionality
  - [ ] Test Easter Egg triggers
  - [ ] Document any layout issues

- [ ] Create Component Re-export File
  - [ ] Create/verify src/components/index.ts
  - [ ] Add barrel exports for all components
  - [ ] Document export structure
  - [ ] Update imports throughout codebase

- [ ] Add TypeScript Type Definitions
  - [ ] Add types for MenuBar props
  - [ ] Add types for PageSpace props
  - [ ] Add types for Toast notifications
  - [ ] Add types for Easter Egg triggers
  - [ ] Update component interfaces

- [ ] Final Code Review Before App.tsx Deletion
  - [ ] Check for remaining App.tsx references
  - [ ] Verify no circular dependencies
  - [ ] Test in development mode
  - [ ] Check bundle size impact
  - [ ] Create backup commit

## Priority 2 - High Impact Features
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

## Priority 3 - Code Quality & Testing (Before App.tsx Deletion)

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

## Priority 4 - Interactive Systems

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

## Priority 4 - Final Actions

- [ ] Execute App.tsx Deletion (After completing Priority 1-3)
  - [ ] Verify App.tsx reduced from 589 lines to target (<150 lines)
  - [ ] Make git commit before deletion for backup
  - [ ] Identify exact lines to remove
  - [ ] Verify no broken imports
  - [ ] Test full functionality after deletion
  - [ ] Document final reduction stats

## Next Steps
- [ ] Execute Priority 1 code design improvements (4-6 hours)
- [ ] Execute Priority 2 essential features (3-4 hours)
- [ ] Execute Priority 3 code quality/testing (4-5 hours)
- [ ] Review Refactor Plan before App.tsx deletion
- [ ] Get approval for App.tsx reduction target
- [ ] Implement stub components for extracted modules
- [ ] Remove all cruft from App.tsx
- [ ] Test that App.tsx remains functional after all extractions
- [ ] Final cleanup and verification