# Project Tasks

## Completed
- [x] Extract assistant/conversation system components
  - [x] AssistantConversationModal.tsx - Created
  - [x] AssistantResponseWindow.tsx - Created
  - [x] useAssistantConversationState.ts - Created
  - [x] assistant/index.ts - Created
  - [x] App.tsx reduced from 1448 → 445 lines
  - [x] Deleted src/App.tsx (replaced by Website.tsx)

- [x] Extract route normalization and hash management system
  - [x] Create src/utils/routeNormalization.ts - Created (123 lines)
  - [x] Create src/hooks/useRouteHash.ts - Created (209 lines)
  - [x] Updated src/components/Website.tsx with imports and TODO comments
  - [x] Website.tsx reduced from 1448 → 445 lines (50% reduction)
  - [x] Created src/components/index.ts for barrel exports

## Priority 1 - Code Design

- [x] Update Website Architecture Design Document to match actual implementation
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

## Priority 2 - Essential Features (Before Finalization)

- [x] Document actual notification implementation
  - [x] Document react-toastify usage (main.css:853-865)
  - [x] Document bottom-center position (not top-center)
  - [x] Document auto-dismiss timing (2000ms)
  - [x] Document z-index: 9999
  - [x] Note: Toast library approach is acceptable (not popup style)

- [ ] Complete LinkConfirmModal Component
  - [ ] Implement missing functionality
  - [ ] Add expected features based on design
  - [ ] Integrate with modal layer
  - [ ] Test modal behavior

- [ ] Document Easter Egg Systems
  - [x] Create implementation index with file locations
  - [x] Document all trigger methods
  - [x] Add test cases for each system
  - [x] Document animation timing (180ms, 0.6s, 220ms)

- [ ] Verify Component Extraction Status
  - [ ] Check remaining Website.tsx imports
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

- [ ] Final Code Review Before Finalization
  - [ ] Check for remaining Website.tsx references
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
  - [ ] Reduce Website.tsx by ~100 lines

- [ ] Extract Dev Window System (lines 32-36, 210-231)
  - [ ] Create src/hooks/useDevWindow.ts
    - [ ] Manage dev window iframe loading
    - [ ] Handle connection status checking
    - [ ] Manage fallback and redirect logic
    - [ ] Store devWindowRef ref
  - [ ] Reduce Website.tsx by ~30 lines

## Priority 3 - Code Quality & Testing (Before Finalization)

- [ ] Extract Admin Login Redirect System (lines 187-222)
  - [ ] Create src/hooks/useAdminProtection.ts
    - [ ] Manage admin login redirect timing
    - [ ] Implement unauthorized access detection
    - [ ] Handle redirect timeouts
  - [ ] Reduce Website.tsx by ~40 lines

- [ ] Extract Page Content Router (lines 396-538)
  - [ ] Create src/components/PageRouter.tsx
    - [ ] Route-based content rendering
    - [ ] Handle different page cases (/, /addons, /blog, etc.)
    - [ ] Replace inline-coded page content sections
  - [ ] Reduce Website.tsx by ~100 lines

- [ ] Extract Meta Tags Management (lines 165-185)
  - [ ] Create src/hooks/useMetaTags.ts
    - [ ] Update SEO meta tags dynamically
    - [ ] Handle canonical links
    - [ ] Manage social media sharing data
  - [ ] Reduce Website.tsx by ~25 lines

## Priority 4 - Interactive Systems

- [ ] Extract Clippy Drag & Drop Utilities (lines 290-370)
  - [ ] Create src/utils/clippyDragDrop.ts
    - [ ] Ghost element creation
    - [ ] Drop target detection
    - [ ] Drag highlight management
    - [ ] Touch event handling
  - [ ] Reduce Website.tsx by ~80 lines

- [ ] Extract Clippy Interactive Element System (lines 22-42, 258-270)
  - [ ] Create src/hooks/useClippy.ts
    - [ ] Clippy click handlers
    - [ ] Hold timer management
    - [ ] Theme flash trigger on interaction
    - [ ] Right-click context menu handling
  - [ ] Create src/utils/clippyInteraction.ts
    - [ ] Context menu flash effect
    - [ ] Assistant configuration fallback
  - [ ] Reduce Website.tsx by ~100 lines

- [ ] Extract Context Menu Handler (lines 379-394)
  - [ ] Create src/hooks/useContextMenu.ts
    - [ ] Handle right-click events
    - [ ] Trigger flash effects
    - [ ] Call assistant configuration
  - [ ] Reduce Website.tsx by ~15 lines

## Done
- [x] Move pages.json from root to src/pages/pages.json
- [x] Update import in src/App.tsx to './pages/pages.json'
- [x] Update import in src/components/SitemapContent.tsx to '../pages/pages.json'
- [x] Extract assistant/conversation system
- [x] Extract route normalization and hash management
- [x] Create src/utils/appConstants.ts with constants and helpers
- [x] Create src/components/index.ts for exports
- [x] Delete src/App.tsx (replaced by Website.tsx)
- [x] Reduce Website.tsx from 1448 → 445 lines (50% reduction)
- [x] Extract page components (ContactPage, NotFoundPage, PagertsPage, ResumePage, WowPage)
- [x] Split Website.tsx into modular components
- [x] Create modular stats box (StatsBox.tsx)
- [x] Extract modal components (AssistantConversationModal, AssistantResponseWindow, LinkConfirmModal)
- [x] Create component re-export file (index.ts)
- [x] Add TypeScript type definitions where appropriate
- [x] Update DESIGN_DOCUMENT.md to match actual implementation
- [x] Update REFACTOR_PLAN.md with progress

## Priority 4 - Final Actions

- [ ] Execute Final Component Consolidation (After completing Priority 1-3)
  - [ ] Verify Website.tsx handles all application logic
  - [ ] Make git commit for backup before major changes
  - [ ] Identify exact lines to consolidate
  - [ ] Verify no broken imports
  - [ ] Test full functionality
  - [ ] Document final component architecture

## Next Steps
- [ ] Execute Priority 1 code design improvements (4-6 hours)
  - [ ] Complete PageSpace Implementation
  - [ ] Unify and Document Theme System
  - [ ] Standardize Z-Index Usage
- [ ] Execute Priority 2 essential features (3-4 hours)
  - [ ] Complete LinkConfirmModal Component
  - [ ] Verify Component Extraction Status
  - [ ] Test Full Component Integration
  - [ ] Create Component Re-export File (already done)
  - [ ] Add TypeScript Type Definitions
  - [ ] Final Code Review Before Finalization
- [ ] Execute Priority 3 high impact features (4-5 hours)
- [ ] Execute Priority 4 interactive systems (6-8 hours)
- [ ] Final cleanup and verification