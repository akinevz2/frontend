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
  previousClassNames: ["default", "border-flash", "lilac"],
  persistence: "none",
  accessibility: { setColorScheme: false },
};

/**
 * Initialize theme from persisted cookie
 * @returns Theme configuration object
 */
export function initializeTheme(): Theme {
  const persistedTheme = readPersistedThemeNameFromCookie(THEME_COOKIE_NAME);
  const initialThemeName = persistedTheme === "lilac" ? "lilac" : "default";

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
export function triggerBorderFlashTheme(wasLilac: boolean) {
  const currentTheme = getTheme("flash");

  setTheme({
    ...currentTheme,
    persistence: "none",
  });

  const flashDuration = 180;
  // The timeout is intentional but not used because we don't need the ref
  const _flashTimer = window.setTimeout(() => {
    const restoreTheme = wasLilac ? getTheme("lilac") : getTheme("default");
    setTheme({
      ...restoreTheme,
      persistence: "none",
    });
  }, flashDuration);
  return _flashTimer;
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
 */
export const THEME_Z_INDICES = {
  BASE: 100, // Normal page content
  NAVIGATION: 1000, // Fixed Menu Bar at top
  INTERACTION: [999, 1024], // Links, buttons, unhide buttons
  MODALS_WINDOWED: [8999, 9000], // Maximized windowed modals
  NOTIFICATIONS: 9999, // Toast container (bottom-center)
  OVERLAY: 1000, // Modal backdrop overlay
  CLIPPY: 9999, // Clippy drag-drop elements
} as const;

// Component imports - To be verified and integrated later
// These are currently using @ts-ignore to suppress errors until components are properly created
// TODO: Replace null with actual imports once components are verified
