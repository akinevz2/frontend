# Refactor Implementation Plan

## Phase 1: Fix Design Documentation (Priority 1 - Code Design)

### Action Required: Update DESIGN_DOCUMENT.md to match actual implementation

Based on validation findings, update and add:

#### 1.1 Update Component Specifications
- [ ] **Menu Bar**: Update to reflect actual features (keyboard nav, Clippy D&D, menu hiding)
  - Height: `calc(2em + 4px)` (16px)
  - Z-index: 1000
  - Features list as implemented

- [ ] **Page Space**: Fix to reflect empty stub status
  - Remove "scrollable container" claim
  - Document as "placeholder component"
  - CSS currently fixes to viewport (problematic)

- [ ] **Content Window**: Align with actual implementation
  - Width: `min(768px, 100% - (var(--gap-size) * 2))` instead of "800px minimum"
  - Responsive breakpoints: 480px, 768px
  - Width 768px on tablet/desktop, 96vw on mobile

- [ ] **Modal Layer**: Document actual implementations
  - Menu Bar: z-index 1000
  - Windowed modals: z-index 8999-9000
  - Assistant Modal: z-index 11000
  - ToastContainer: z-index 9999

- [ ] **Notification Popup**: Update to reflect toast implementation
  - Position: Bottom-center (not top-center/right)
  - Auto-close: 2000ms
  - Library: react-toastify
  - Style: Custom container styling

- [ ] **Components Mapping**: Add actual file locations
  - Menu Bar → `src/components/MenuBar.tsx`
  - Page Space → `src/components/PageSpace.tsx` (stub)
  - Content Window → `src/windowing/Section.tsx`
  - Modal → `src/components/AssistantConversationModal.tsx`
  - Notifications → React Toastify
  - Easter Eggs → Multiple scattered implementations

#### 1.2 Add Missing Sections
- [ ] **Z-Index Layering System**: Document all z-index values
  - Base content: 100
  - Menu Bar: 1000
  - Links/Buttons: 999-1024
  - Unhide button: 999-1024
  - Windowed modals: 8999-9000
  - ToastContainer: 9999
  - Assistant Modal: 11000

- [ ] **Animation Duration Standards**: Document actual timings
  - Section wobble: 0.6s ease-in-out
  - Window transitions: 120ms ease-out
  - Border flash: 180ms
  - Assistant fade: 220ms ease
  - Toast dismiss: 2000ms
  - Title bar hover: 0.1s ease

- [ ] **Responsive Breakpoint Reference Table**: Document actual values
  ```
  480px (XS): Menu bar 24px, Mobile 96vw
  768px (PAD): Tablet 768px, Desktop 768px
  > 768px: Desktop with gaps
  ```

- [ ] **Theme Persistence Mechanism**: Document actual implementation
  - Primary theme: CSS variables (not cookie-based as designed)
  - Lilac theme: Cookie `wow-username-theme`
  - Border flash: Temporary flash (180ms), no persistence
  - Theme wobble: Animation on click (0.6s)

- [ ] **Easter Egg Systems**: Document all implementation locations
  - Border flash on Clippy click (Section.tsx:97-148)
  - Lilac theme via cookie (appConstants.ts:48-71)
  - "Fuckingclippy" link handler (Section.tsx:379)
  - Feef69 pages (Website.tsx:46, 696-703)
  - Clippy D&D navigation (Section.tsx drag handlers)

#### 1.3 Update Code Locations
- [ ] Update "Common Code Locations" section with accurate paths
- [ ] Add "Windowing System" section referencing `src/windowing/Section.tsx`
- [ ] Document "Toast Notification System" separately
- [ ] Add "Easter Egg Implementation Index"

#### 1.4 Update Technical Constraints
- [ ] Remove "No virtual scrolling if content > 5000 lines" (not implemented)
- [ ] Add "No scroll event handlers in current implementation"
- [ ] Update "Browser Compatibility" to reflect modern only
- [ ] Remove "Click-jacking prevention" (not relevant to stack)

#### 1.5 Update Testing Checklist
- [ ] Add z-index layering verification tests
- [ ] Add animation duration consistency tests
- [ ] Add theme persistence accuracy tests
- [ ] Add Easter Egg trigger verification tests
- [ ] Add responsive breakpoint tests

#### 1.6 Re-Document Success Criteria
- [ ] Rewrite to match actual implementation behavior
- [ ] Focus on preserving existing appearance (old website)
- [ ] Accept current modal format (toasts) as acceptable
- [ ] Document tolerance for 768px vs 800px width

---

## Phase 2: Complete Component Extraction (Before Refactoring)

### Action Required: Verify extraction is complete

- [ ] **Verify current files** handle main application logic
  - Current: Website.tsx, Section.tsx, routing functionality
  - Check component imports and app structure

- [ ] **Check Component Imports**: Ensure all dependencies accounted for
  - MenuBar (imported, implemented)
  - PageSpace (stub, needs integration)
  - Section.tsx (main content - implemented)
  - Toast notifications (react-toastify)
  - Assistant modals (implemented)
  - Context menu handlers (implemented)

- [ ] **Identify remaining Application Logic**:
  - Route normalization (useRouteHash hook - maintained in Website.tsx)
  - Theme handling (CSS variables approach - maintained in Website.tsx)
  - App layout structure (needs verification in Website.tsx)
  - Mounting logic (React lifecycle in main.tsx)

---

## Phase 3: Reorder TODO.md with Optimized Task List

### Priority 1 - Critical Fixes (Must Do Before Refactoring)

1. **Update Design Documentation** (30 min)
   - Fix PageSpace component status
   - Update content window widths
   - Document z-index hierarchy
   - Document actual notification approach

2. **Complete PageSpace Implementation** (1 hour)
   - Remove empty stub
   - Integrate with content layout
   - Remove problematic "fixed" CSS

3. **Unify and Document Theme System** (1 hour)
   - Remove cookie-based theme claims
   - Document CSS variable approach
   - Add theme wobble animation

4. **Standardize Z-Index Usage** (30 min)
   - Identify all z-index usages throughout code
   - Create z-index reference table
   - Update Modal components to use consistent values

### Priority 2 - Essential Features (Prepare for Refactoring)

1. **Integrate Toast Notifications** (1 hour)
   - Review current toast implementation
   - Document configuration options
   - Check styling consistency
   - Ensure close button works

2. **Complete LinkConfirmModal** (45 min)
   - Implement empty component
   - Add expected functionality based on design
   - Integrate with modal layer

3. **Document Easter Egg Systems** (30 min)
   - Create implementation index
   - Add trigger documentation
   - Create test cases

4. **Verify Component Extraction Status** (1 hour)
   - Check App.tsx imports
   - Verify extracted modules work
   - Identify any remaining inline code

### Priority 3 - Code Quality & Testing (Before Deletion)

1. **Test Full Component Integration** (2 hours)
   - Test layout rendering
   - Test responsive behavior
   - Test modal interactions
   - Test notification flow
   - Test theme switching

2. **Create Component Re-export file** (30 min)
   - Create `src/components/index.ts` export mapping
   - Add barrel exports for easy imports
   - Document export structure

3. **Add TypeScript Type Definitions** (1 hour)
   - Add types for MenuBar props
   - Add types for PageSpace props
   - Add types for Toast configurations
   - Add types for Easter Egg triggers

4. **Final Code Review** (1 hour)
   - Check for any App.tsx still referenced
   - Verify no circular dependencies
   - Test in development mode
   - Check bundle size

---

## Phase 4: Finalize Component Architecture (After Phases 1-3 Complete)

**Only proceed after:**
- [ ] Design documentation updated and validated
- [ ] PageSpace completed
- [ ] Theme system documented
- [ ] Z-index hierarchy standardized
- [ ] All components tested and working
- [ ] Component exports properly set up
- [ ] No breaking changes detected
- [ ] Backward compatibility verified

### Action Steps:
1. [ ] Make git commit of current state as backup
2. [ ] Verify all documentations match actual implementation
3. [ ] Run full integration tests
4. [ ] Test all routes and components
5. [ ] Final code review and cleanup

---

## Expected Outcomes

### After Phase 1 (Documentation Fixed):
- Design document reflects actual implementation
- All discrepancies documented
- Component mapping clear
- Technical constraints accurate
- Success criteria realistic

### After Phase 2 (Component Prep):
- PageSpace no longer an empty stub
- Theme system consistent with implementation
- Z-index values standardized
- Toast notifications properly integrated
- Easter egg systems documented

### After Phase 3 (Pre-Deletion):
- Website.tsx handles main application logic
- All components exportable
- Component types defined
- Full integration tested
- Zero breaking changes

### After Phase 4 (Deletion):
- No App.tsx references in documentation
- All functionality preserved
- Codebase cleaner
- Future refactoring easier
- Documentation up to date

---

## Estimated Timeline

- Phase 1: 4 hours
- Phase 2: 4 hours
- Phase 3: 4.5 hours
- Phase 4: 1 hour
- **Total**: ~13.5 hours

## Risk Assessment

**High Risk Items:**
- PageSpace integration (affects core layout)
- Toast notification position change
- Z-index unification

**Mitigation:**
- Test thoroughly after each change
- Keep backup commits
- Verify in development mode before production
- Run complete integration tests

**Acceptable Risks:**
- Width changes from 800px to 768px (small, users won't notice)
- Toast position change (may annoy some users)
- Missing easter egg system (not critical feature)

---

## Approval Required

This plan requires review and approval before execution, particularly:
1. PageSpace redesign (affects layout behavior)
2. Toast notification format changes
3. Z-index hierarchy implementation
4. App.tsx deletion target size

**Questions/Major Concerns:**
- Should we keep the layout as-is (768px width) instead of updating design?
- Accept toast notifications as-is, or force new popup format?
- Remove all App.tsx or leave minimal core?

Please review and provide approval or modifications to proceed.
