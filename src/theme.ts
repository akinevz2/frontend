import {
  setTheme,
  readPersistedThemeNameFromCookie,
} from "lightdni-jssas-toggle";

// Theme configurations
export interface Theme {
  themeName: "default" | "flash" | "lilac";
  themes: {
    default: {
      className: string;
      variables: { "--clippy-border-flash-color": string };
    };
    flash: {
      className: string;
      variables: { "--clippy-border-flash-color": string };
    };
    lilac: {
      className: string;
      variables: { "--clippy-border-flash-color": string };
    };
  };
  previousClassNames: string[];
  persistence: string;
  accessibility: { setColorScheme: boolean };
}

const THEME_COOKIE_NAME = "wow-username-theme";

// Available themes with their configurations
const DEFAULT_THEME: Theme = {
  themeName: "default",
  themes: {
    default: {
      className: "theme-default",
      variables: { "--clippy-border-flash-color": "transparent" },
    },
    flash: {
      className: "theme-border-flash",
      variables: { "--clippy-border-flash-color": "#FEEF69" },
    },
    lilac: {
      className: "theme-lilac",
      variables: { "--clippy-border-flash-color": "transparent" },
    },
  },
  previousClassNames: [
    "theme-default",
    "theme-border-flash",
    "theme-lilac" as any,
  ],
  persistence: "none" as any,
  accessibility: { setColorScheme: false },
};

/**
 * Initialize theme from persisted cookie
 * @returns Theme configuration object
 */
export function initializeTheme(): Theme {
  const persistedTheme = readPersistedThemeNameFromCookie(THEME_COOKIE_NAME);
  const initialThemeName =
    persistedTheme === "theme-lilac" ? "theme-lilac" : "theme-default";

  setTheme({
    ...DEFAULT_THEME,
    themeName: initialThemeName,
    persistence: "cookie",
  });

  return {
    ...DEFAULT_THEME,
    themeName: initialThemeName,
  };
}

/**
 * Get theme object with current theme name applied
 * @param themeName - Name of the theme to return (default, flash, lilac)
 * @returns Current theme configuration
 */
export function getTheme(themeName: "default" | "flash" | "lilac"): Theme {
  return {
    ...DEFAULT_THEME,
    themeName,
  };
}

/**
 * Trigger border flash theme effect
 * Temporarily switches to flash theme and then restores the previous theme
 * @param wasLilac - Whether the theme was lilac before flashing (to restore later)
 */
export function triggerBorderFlashTheme(wasLilac: boolean): void {
  const currentTheme = getTheme("flash");

  setTheme({
    ...currentTheme,
    persistence: "none" as any, // Type assertion needed for external library compatibility
  });

  const flashDuration = 180;
  // The timeout is intentional but not used because we don't need the ref
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _flashTimer = window.setTimeout(() => {
    const restoreTheme = wasLilac ? getTheme("lilac") : getTheme("default");
    setTheme({
      ...restoreTheme,
      persistence: "none" as any,
    });
  }, flashDuration);
}

/**
 * Play tada audio when transitioning to lilac theme
 * Called when document becomes visible and theme is lilac
 * @param tadaAudioPath - Path to the tada audio file
 */
export function playThemeTransitionAudio(
  tadaAudioPath: string = "/tada.wav",
): void {
  try {
    const audio = new Audio(tadaAudioPath);
    void audio.play();
  } catch (error) {
    console.warn("Failed to play theme transition audio:", error);
  }
}

/**
 * Check if current page should have feef69 class
 * @param hash - Hash from window.location.hash
 * @returns boolean indicating if feef69 page
 */
export function isFeef69Page(hash: string): boolean {
  return hash === "#feef69";
}

/**
 * Get theme transition color
 * Useful for dynamic theming needs
 * @param themeName - Name of the theme to get transition color for
 * @returns Hex color of the border flash color
 */
export function getThemeTransitionColor(
  themeName: "default" | "flash" | "lilac",
): string {
  const theme = getTheme(themeName);
  return theme.themes[themeName].variables[
    "--clippy-border-flash-color"
  ] as string;
}

// ============================================================================
// THEME COMPONENT BUNDLE - Abstract Concept of Site Theme and Design
// ============================================================================

/**
 * Z-Index Constants for Theme and Layout Layering
 * Defines the stacking order between MenuBar, PageSpace, Content Windows, and Modals
 *
 * Layer Hierarchy:
 * 1. Base Content (100) - Normal content
 * 2. Navigation (1000) - Fixed top Menu Bar
 * 3. Interaction (999-1024) - Links, Buttons, Unhide
 * 4. Modals (8999-9000) - Windowed maximsed views
 * 5. Notifications (9999) - Toast container
 * 6. Primary Modal (11000) - Assistant and full-screen modals
 */
export const THEME_Z_INDICES = {
  BASE: 100, // Normal page content
  NAVIGATION: 1000, // Fixed Menu Bar at top
  INTERACTION: [999, 1024], // Links, buttons, unhide buttons
  MODALS_WINDOWED: [8999, 9000], // Maximized windowed modals
  NOTIFICATIONS: 9999, // Toast container (bottom-center)
  PRIMARY_MODAL: 11000, // Full-screen assistant modals
  OVERLAY: 1000, // Modal backdrop overlay
  CLIPPY: 9999, // Clippy drag-drop elements
} as const;

// Component imports - To be verified and integrated later
// These are currently using @ts-ignore to suppress errors until components are properly created
// TODO: Replace null with actual imports once components are verified
let MenuBar: any = null;
let PageSpace: any = null;
let Modal: any = null;
let AssistantConversationModal: any = null;
let LinkConfirmModal: any = null;

/**
 * Page Space Theme Configuration
 * Defines layout behavior, theme responsiveness, and scroll container settings
 */
export interface PageSpaceThemeConfig {
  zIndex: number; // Must NOT be fixed (current issue)
  height: number; // 100vh viewport height
  width: number; // 100vw viewport width
  mobileHeight: number; // 100dvh dynamic viewport height
  scrollBehavior: string; // 'auto' or 'smooth'
  themeResponsive: boolean; // Enables theme-based styling
  animationDuration: number; // Page space animation timing
  className: string; // CSS class name for theming
  containerGap: number; // Spacing from other elements
}

/**
 * Menu Bar Theme Integration
 * Defines theme behavior, animation timing, and cookie persistence
 */
export interface MenuBarThemeConfig {
  zIndex: number; // Fixed at top, z-index 1000
  height: number; // 16px (calc(2em + 4px))
  zIndexNavigation: number; // Fixed positioning z-index
  animationDuration: number; // Title bar hover animation (0.1s)
  windowTransitionDuration: number; // Window transition timing (120ms)
  themePersistence: {
    // Using cookie-based persistence
    cookieName: string; // "wow-username-theme"
    enabled: boolean; // Lilac theme persistence
  };
  borderFlashDuration: number; // Theme wobble time (0.6s)
  borderFlashThreshold: number; // Flash trigger duration (180ms)
}

/**
 * Content Window Theme Configuration
 * Defines width specs, responsive breakpoints, and theme alignment
 */
export interface ContentWindowThemeConfig {
  tabletWidth: number; // 768px min width (tablet/pad)
  desktopWidth: number; // 768px max width (desktop)
  mobileWidth: string; // "96vw" (full width)
  gapSize: number; // Dynamic gap adjustment
  responsiveBreakpoints: {
    // Primary breakpoints
    mobile: number; // 480px (Extra small)
    tablet: number; // 768px (Tablet/PAD)
    desktop: number; // 768px (Desktop - same as tablet)
  };
  themeCentered: boolean; // Centered horizontally
  themeResponsive: boolean; // Enables theme-based styling
  maxViewportWidth: string; // calc(100vw - 32px)
  baseHeight: string; // calc(100vh - menu-bar-height - 32px)
  animationDuration: number; // Window transitions (120ms ease-out)
}

/**
 * Toast Notification System Theme Configuration
 * Notification positioning, auto-dismiss timing, and z-index hierarchy
 */
export interface ToastThemeConfig {
  zIndex: number; // 9999
  position: "bottom-center"; // Bottom-center (not top-center/right)
  autoDismissDuration: number; // 2000ms
  manualDismiss: boolean; // Close icon button enabled
  maximumHeight: number; // Short maximum height for scrolling
  scrollableContent: boolean; // Content within toast is scrollable
  style: "toast-notification"; // Toast style, not popup modal
}

/**
 * Easter Egg Theme Integration
 * Multiple Easter Egg systems for theme interactions and animations
 */
export interface EasterEggThemeConfig {
  borderFlashDuration: number; // 180ms (0.18s)
  themeWobbleDuration: number; // 0.6s ease-in-out
  themeRestorationMethod: {
    // Temporary flash (no persistence)
    duration: number; // Flash duration
    persistence: "none"; // No cookie persistence
  };
  audioOnVisibility: {
    // Audio on page visibility change
    enabled: boolean; // Audio playback on first view
    audioPath: string; // "/tada.wav"
  };
  lilacThemeCookie: {
    // Cookie-based lilac theme persistence
    name: string; // "wow-username-theme"
    effect: "persistent-lilac"; // Custom color scheme
    trigger: "cookie-persistence"; // Cookie presence check
  };
  themeTransitionColor: string; // Transition color for dynamic theming
}

/**
 * Component Re-exports - Theme Bundle Index
 * Acts as an index.ts file for all theme-related components
 */

// Export all theme-related components that create a logical bundle of theme functionality
// NOTE: These exports need to be verified - some components may not have default exports
// TODO: Verify each component's export format before using wildcard exports
export { } from /* default as MenuBar */ "./components/MenuBar";
export { } from /* default as PageSpace */ "./components/PageSpace";
export { } from /* default as Modal */ "./components/Modal";
export { } from /* default as AssistantConversationModal */ "./components/AssistantConversationModal";
export { } from /* default as LinkConfirmModal */ "./components/LinkConfirmModal";
export { default as StatsBox } from "./components/StatsBox";
export { default as Window } from "./components/Window";
export { default as BlogContent } from "./components/deprecated/BlogPageREFACTOR_NEEDED";
export { default as MusicContent } from "./components/deprecated/MusicContent";
export { default as SitemapContent } from "./components/SitemapContent";

/**
 * Theme System Bundle Integration
 * Combines all theme-related components and utilities into a cohesive system
 */
export interface ThemeSystemBundle {
  // Component exports
  components: {
    MenuBar: typeof MenuBar;
    PageSpace: typeof PageSpace;
    Modal: typeof Modal;
    AssistantConversationModal: typeof AssistantConversationModal;
    LinkConfirmModal: typeof LinkConfirmModal;
  };

  // Theme utilities
  theme: {
    initializeTheme: () => Theme;
    getTheme: (
      themeName: "theme-default" | "theme-border-flash" | "theme-lilac",
    ) => Theme;
    triggerBorderFlashTheme: (wasLilac: boolean) => void;
    playThemeTransitionAudio: (tadaAudioPath: string) => void;
    isFeef69Page: (hash: string) => boolean;
    getThemeTransitionColor: (
      themeName: "theme-default" | "theme-border-flash" | "theme-lilac",
    ) => string;
  };

  // Configuration constants
  zIndices: typeof THEME_Z_INDICES;
  pageSpaceConfig: typeof PageSpaceThemeConfig;
  menuBarConfig: typeof MenuBarThemeConfig;
  contentWindowConfig: typeof ContentWindowThemeConfig;
  toastConfig: typeof ToastThemeConfig;
  easterEggConfig: typeof EasterEggThemeConfig;
}

/**
 * Complete Theme System Bundle
 * Provides access to all theme-related components, utilities, and configurations
 */
export const ThemeSystem: ThemeSystemBundle = {
  components: {
    // TODO: Integrate actual component imports
    MenuBar: null as any,
    PageSpace: null as any,
    Modal: null as any,
    AssistantConversationModal: null as any,
    LinkConfirmModal: null as any,
  },
  theme: {
    initializeTheme,
    getTheme,
    triggerBorderFlashTheme,
    playThemeTransitionAudio,
    isFeef69Page,
    getThemeTransitionColor,
  },
  zIndices: THEME_Z_INDICES,
  // TODO: Integrate actual config values below (created as placeholders above)
  pageSpaceConfig: {} as PageSpaceThemeConfig,
  menuBarConfig: {} as MenuBarThemeConfig,
  contentWindowConfig: {} as ContentWindowThemeConfig,
  toastConfig: {} as ToastThemeConfig,
  easterEggConfig: {} as EasterEggThemeConfig,
};
