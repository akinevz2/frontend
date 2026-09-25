# Website Architecture Design Document

## Overview
This document defines the core mechanical architecture of the "old style" website being preserved and untangled through the refactor. The website maintains a distinctive window-based layout reminiscent of desktop applications.

**⚠️ IMPORTANT**: This design document reflects the **actual implementation** as found in the codebase, not the ideal design previously documented. See REFACTOR_PLAN.md for planned improvements.

## Component Hierarchy

```
┌─────────────────────────────────────────────────┐
│               MENU BAR                         │ ← Fixed at top, z-index 1000
├─────────────────────────────────────────────────┤
│              PAGE SPACE                        │ ← Currently fixed position (needs update)
│  ┌─────────────────────────────────────────┐    │
│  │        CONTENT WINDOW                  │    │
│  │  (Centered, 768px width, grows vertically)│   │
│  └─────────────────────────────────────────┘    │
├─────────────────────────────────────────────────┤
│               MODAL LAYER                      │ ← Complex z-index layers
│                      ↑                          │
│          Z-index 8999-9000 (Windowed)           │
│               Z-index 11000 (Assistant)         │
│               Z-index 9999 (Toast)              │
└─────────────────────────────────────────────────┘
```

## 1. Menu Bar Component

### Position
- **Fixed**: Attached to the top edge of the viewport
- **Alignment**: Centered horizontally (full viewport width)
- **Height**: `calc(2em + 4px)` (16px)
- **Z-index**: 1000
- **File**: `src/components/MenuBar.tsx` (212 lines)

### Functionality
- Primary navigation interface
- Keyboard navigation (first letter shortcuts)
- Theme controls (border flash, lilac themes)
- Clippy drag-and-drop functionality
- Menu hiding for admin area
- Documentation links
- About/Contact information

### State Management
- Theme state (CSS variables)
- Active menu items via filtering
- Responsive behavior with keyboard navigation
- **⚠️ Cookie-based theme persistence**: Uses `wow-username-theme` cookie for lilac theme (not `lightdni-jssas-toggle` as in original design)

### Animation
- Window transition: 120ms ease-out
- Title bar hover: 0.1s ease

---

## 2. Page Space Component

### Current Status
**⚠️ CRITICAL ISSUE**: The PageSpace component is currently an **empty stub** in `src/components/PageSpace.tsx`. The actual content layout is embedded in `src/windowing/Section.tsx` (1405 lines).

### CSS Implementation (Needs Fix)
- **File**: `/home/kine/development/personal/website/src/components/PageSpace.css`
- **Position**: `position: fixed; top: 0; left: 0` (INCORRECT - should not be fixed)
- **Dimensions**: 
  - Width: `100vw` (100% viewport width)
  - Height: `100vh` (100% viewport height)
  - Mobile: `100dvh` (dynamic viewport height)
- **Issue**: Fixed positioning conflicts with scroll container requirements

### Required Fix (Phase 1)
- Remove fixed positioning
- Integrate with actual content layout
- Properly allocate scroll space
- Remove empty stub functionality

---

## 3. Content Window Component

### Positioning
- **Primary Implementation**: `src/windowing/Section.tsx` (lines 1291-1401) for maximization
- **Secondary**: `src/components/Window.css` (48 lines)
- **Z-index**: 8999-9000 (when maximized)

### Width Specifications (Actual Implementation)
- **Desktop/Tablet**: `min(768px, 100% - (var(--gap-size) * 2))` (768px)
- **Mobile**: `96vw` (full width)
- **Responsive Breakpoints**:
  - 480px (Extra small)
  - 768px (Tablet/PAD)
- **⚠️ Width Difference**: Actual 768px vs designed 800px minimum

### Responsiveness
- Mobile: 96vw width, full width
- Tablet: 768px max width
- Desktop: 768px max width with gap adjustment (not 90% viewport)
- **Responsive breakpoint**: 768px primary, 480px for menu bar

---

## 4. Modal Layer

### Purpose
- Overlay layer for temporary pop-up events
- Complex z-index hierarchy (4-6 levels)
- Multiple implementation types

### Content Areas
1. **Main Modal**: `src/components/AssistantConversationModal.tsx` (107 lines)
2. **LinkConfirmModal**: Empty stub in `src/components/LinkConfirmModal.tsx`
3. **Simple Modal**: `src/components/Modal.tsx`
4. **Easter Egg**: Integrated in Section.tsx, App.tsx

### Actual Z-Index Values
- Menu Bar: 1000
- Base content: 100
- Links/Buttons: 999-1024
- Unhide button: 999-1024
- Windowed modals (maximized): 8999-9000
- ToastContainer (notification): 9999
- Assistant Modal: 11000
- **⚠️ Difference**: Actual z-index 4-6 levels vs designed 2 levels

---

## 5. Modal Overlay

### Visuals
- **File**: `src/components/AssistantConversationModal.tsx`
- **Position**: `position: fixed; top: 0; left: 0; right: 0; bottom: 0`
- **Background**: `rgba(0, 0, 0, 0.5)` (fixed opacity)
- **Z-index**: 11000 (not 1000 as designed)
- **Alignment**: Flexbox centering

### Behavior
- Click-through enabled when no modal is active
- Backdrop click handler to close modal
- **⚠️ Difference**: Z-index 11000 vs designed 1000

---

## 6. Primary Modal Window

### Content
- Implemented in `src/windowing/Section.tsx` (lines 1291-1401)
- Not a separate component (uses inline styles)
- Content: Window overlay with modal styling
- **⚠️ Feature**: Same section rendered in modal (implicit content transfer)

### Positioning
- **Width**: `min(768px, 100vw)` and `maxWidth: calc(100vw - 32px)`
- **Height**: `calc(100vh - var(--menu-bar-height, 24px) - 32px)`
- **Max Height**: Same as calculated height
- **Z-index**: 8999-9000

### Behavior
- Smooth animation: Opacity transitions (220ms ease)
- Close handlers: Backdrop click and X button
- Scrollable content within modal
- Fills Page Space content area (when active)

---

## 7. Notification Popup (Toast System)

### Implementation
- **Library**: `react-toastify`
- **File**: `src/App.tsx` line 587
- **Configuration**: Custom styling defined in `main.css` (lines 853-865)
- **Z-index**: 9999
- **Auto-dismiss**: 2000ms

### Position
- **Actual**: Bottom-center (not top-center/right as designed)
- **Configurable**: Can be positioned at top-center/top-right
- **Style**: Toast notification style, not popup modal

### Content
- Alert messages
- Success notifications
- Error/warning displays
- System status updates

### Timing
- **Auto-dismiss**: 2000ms (configurable)
- **Manual dismiss**: Close icon button
- **No scrolling**: Short maximum height

### Current Status
**⚠️ Critical Difference**: Implementation uses toast notifications (bottom-center), not popup style (top-center/right) as originally designed

---

## 8. Easter Egg Systems

### Discovered Implementations
Multiple Easter Egg systems exist without unified approach:

### 1. Border Flash Theme
- **Location**: `src/App.tsx` lines 97-148
- **Trigger**: Clippy click
- **Duration**: 180ms (0.18s)
- **Effect**: Border flash theme with theme wobble
- **No Persistence**: Temporary flash only

### 2. Lilac Theme via Cookie
- **Location**: `src/App.tsx` lines 48-71
- **Cookie**: `wow-username-theme`
- **Trigger**: Cookie presence check
- **Effect**: Persistent lilac theme
- **Format**: Custom color scheme

### 3. "Fuckingclippy" Link Handler
- **Location**: `src/windowing/Section.tsx` line 379
- **Trigger**: Right-click context menu option
- **Effect**: Navigate to `/blog/login`

### 4. Feef69 Pages
- **Locations**: `src/App.tsx` lines 46, 696-703 (content references)
- **Trigger**: URL patterns/content markers
- **Effect**: Page variations with special styling

### 5. Clippy Drag & Drop
- **Location**: `src/App.tsx` lines 258-370
- **Trigger**: Drag elements to specific location
- **Effect**: Navigate to `/blog/login`

### 6. Audio on Visibility
- **Location**: `src/App.tsx` lines 73-80
- **Trigger**: Page visibility change (via IntersectionObserver)
- **Effect**: Audio playback on first view

### Current Status
**⚠️ Major Issue**: No dedicated Easter Egg Popup component. Systems are implemented across multiple files without unified architecture

---

## 9. Interaction Patterns

### Window Maximization
1. Content Window: Shows normal content (Section.tsx)
2. User triggers "maximize" via context menu (right-click)
3. Modal Layer activates with overlay
4. Primary Modal Window appears with same content
5. Window content fits within modal constraints
6. Smooth animation (opacity transitions)
7. Modal can be restored via "Unhide" functionality

### Content Transition
1. Same section rendered in both views (implicit transfer)
2. Window size adjusts to modal constraints
3. No animated content transfer
4. Smooth window transitions (120ms ease-out)

### Theme Integration
- Theme changes affect:
  - Menu Bar styling (CSS variables)
  - Content Window styling (Section.tsx)
  - Modal Window styling (inline styles)
  - Notification Popup (main.css custom styles)
- **⚠️ Mixed System**:
  - CSS variables for primary theme
  - Cookie `wow-username-theme` for lilac theme
  - Temporary border flash (180ms, no persistence)

### Cookie System
- **Theme**: `wow-username-theme` (lilac theme)
- **Not Implemented**: `lightdni-jssas-toggle` cookie (misunderstood in original design)

---

## 10. Technical Constraints

### Performance
- **No virtual scrolling**: Not implemented
- **Debounced scroll events**: Not implemented
- **Smooth scroll**: `scrollIntoView({ behavior: "smooth" })` used

### Current Implementation Status
- **Missing**: Explicit scroll event handlers
- **Hash-based navigation**: Used instead (Section.tsx lines 1207-1237)
- **Auto-scroll**: Used for permalink navigation

### Browser Compatibility
- **Tested**: Modern Chrome/Edge/Firefox (last 2 versions)
- **Not Specified**: Safari support
- **Not Specified**: Mobile browser support (basic)

---

## 11. Z-Index Layering System (Actual Implementation)

### Complete Z-Index Reference
| Layer | Component | Z-Index Range | Usage |
|-------|-----------|---------------|-------|
| Base | Content | 100 | Normal content |
| Navigation | Menu Bar | 1000 | Fixed top menu |
| Interaction | Links/Buttons | 999-1024 | Interactive elements |
| Unhide | Admin buttons | 999-1024 | Admin area |
| Modals | Windowed modals | 8999-9000 | Maximization view |
| Notification | ToastContainer | 9999 | Toast notifications (bottom-center) |
| Primary Modal | Assistant modal | 11000 | Full-screen modals |

**⚠️ Complexity**: 4-6 level hierarchy vs designed 2 levels

---

## 12. Animation Duration Standards

### Documented Durations
| Animation | Duration | Ease Type |
|-----------|----------|-----------|
| Section wobble | 0.6s | ease-in-out |
| Window transitions | 120ms | ease-out |
| Border flash theme | 180ms | N/A |
| Assistant fade | 220ms | ease |
| Toast dismiss | 2000ms | N/A |
| Title bar hover | 0.1s | ease |

**⚠️ Not Documented**: Multiple animation durations in original design

---

## 13. Responsive Breakpoint Reference Table

### Actual Implementation
```
480px (Extra Small):
  - Menu bar height: 24px
  - Mobile width: 96vw
  - Responsive adjustments

768px (Tablet/PAD):
  - Tablet width: 768px max
  - Desktop width: 768px max (fixed)
  - Gap size adjustments
  - Window styling changes

> 768px:
  - Desktop layout with viewport-based sizing
  - Responsive gap implementation
```

**⚠️ Difference**: 1024px breakpoint designed but not used; 768px is primary for both tablet and desktop

---

## 14. Theme Persistence Mechanism

### Actual Implementation (Mixed System)
1. **CSS Variables** (Primary Theme)
   - Current theme state managed via CSS variables
   - Theme switching applies CSS variable changes
   - Primary approach for themes

2. **Cookie System** (Lilac Theme)
   - Cookie Key: `wow-username-theme`
   - Persistence: Cookie-based
   - Application: Conditional theme loading based on cookie presence

3. **Temporary Effects** (Border Flash)
   - Duration: 180ms
   - Persistence: None
   - Trigger: Click/interaction
   - Effect: Border flash animation

4. **Theme Wobble** (Animation)
   - Duration: 0.6s ease-in-out
   - Action: Click interaction
   - Visual: Theme border animation

**⚠️ Difference**: Multiple systems exist with different mechanisms

---

## 15. Code Locations

### Components
| Component | File Path | Status |
|-----------|-----------|--------|
| Menu Bar | `src/components/MenuBar.tsx` | ✓ Fully implemented |
| Page Space | `src/components/PageSpace.tsx` | ⚠️ Empty stub (needs fix) |
| Content Window | `src/windowing/Section.tsx` | ✓ Main implementation |
| Modal | `src/components/AssistantConversationModal.tsx` | ⚠️ Primary modal |
| Simple Modal | `src/components/Modal.tsx` | ⚠️ Basic modal |
| Notification | react-toastify (main.css) | ⚠️ Toast implementation |
| Easter Eggs | Multiple files | ⚠️ Scattered implementations |

### Utils
- Theme engine: `src/App.tsx` (lines 48-148)
- Modal manager: Integrated in components
- Popup controller: Multiple implementations
- Navigation: Hash-based in Section.tsx (lines 1207-1237)

### Hooks
- Theme management: CSS variable approach (not separated)
- Modal state: Integrated in components
- Navigation: Hash-based (Section.tsx)
- Clippy interaction: App.tsx (lines 258-370)

---

## 16. Testing Checklist

### Layout Tests
- [ ] Menu Bar fixed at top with correct z-index
- [ ] Page Space position fixed (needs fix - should not be fixed)
- [ ] Content Window centered horizontally
- [ ] No overlap between Menu Bar and Content Window
- [ ] Content grows vertically, maintains scroll
- [ ] No horizontal overflow at large sizes
- [ ] Responsive breakpoints work correctly

### Modal Tests
- [ ] Modal Layer appears over all content
- [ ] Primary Modal Window shows content properly
- [ ] Modal closes via X button
- [ ] Modal closes via backdrop click
- [ ] Smooth animation works (220ms fade)

### Notification Tests
- [ ] Toast appears at bottom-center
- [ ] Dismiss timer works (2000ms)
- [ ] Close button works
- [ ] Multiple notifications handled correctly

### Easter Egg Tests
- [ ] Border flash triggers on Clippy click on time (180ms)
- [ ] Lilac theme loads via cookie
- [ ] "Fuckingclippy" link navigates correctly
- [ ] Clippy D&D navigation works
- [ ] Audio plays on first view

### Theme Tests
- [ ] CSS variables update immediately
- [ ] Lilac theme loads from cookie (`wow-username-theme`)
- [ ] Border flash theme triggers on Easter Egg
- [ ] All components update theme correctly
- [ ] Theme persists across navigation (for cookies)

---

## 17. Success Criteria (Actual Implementation)

- [ ] Users can navigate via Menu Bar (keyboard + mouse)
- [ ] Content fits within Content Window (768px max)
- [ ] Maximization works via context menu
- [ ] Modals display at correct z-index levels
- [ ] Notifications display and dismiss correctly (bottom-center)
- [ ] Themes switch and apply correctly
- [ ] Easter egg triggers accessible
- [ ] No horizontal scrolling at large sizes
- [ ] Scroll behavior uses hash-based navigation
- [ ] CSS variables update theme immediately

---

## Common Code Locations

### Components
- Menu Bar: `src/components/MenuBar.tsx`
- Page Space: `src/components/PageSpace.tsx` (EMPTY STUB - Needs Integration)
- Content Window: `src/windowing/Section.tsx` (Main implementation)
- Primary Modal: Embedded in `src/windowing/Section.tsx` (lines 1291-1401)
- Notification: `main.css` (lines 853-865) + `react-toastify`
- Easter Eggs: `src/App.tsx`, `src/windowing/Section.tsx`

### Utilities
- Theme handling: `src/App.tsx` (lines 48-148)
- Navigation: `src/windowing/Section.tsx` (lines 1207-1237)
- Clippy interaction: `src/App.tsx` (lines 258-370)
- Modal states: `src/App.tsx` (lines 24-32, 550-555)

### Styling
- Main styles: `src/main.css`
- Window styles: `src/components/Window.css`
- Modal styles: Embedded in component files
- Page Space styles: `src/components/PageSpace.css`

---

*Last Updated: Sept 25, 2026 (Based on REFACTOR_PLAN Validation)*
*Version: 2.0 - Corrected to Match Actual Implementation*
