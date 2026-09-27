import { setTheme, readPersistedThemeNameFromCookie } from "lightdni-jssas-toggle";

// Theme configurations
export interface Theme {
  themeName: string;
  themes: {
    "theme-default": {
      className: string;
      variables: { "--clippy-border-flash-color": string };
    };
    "theme-border-flash": {
      className: string;
      variables: { "--clippy-border-flash-color": string };
    };
    "theme-lilac": {
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
  themeName: "theme-default",
  themes: {
    "theme-default": {
      className: "theme-default",
      variables: { "--clippy-border-flash-color": "transparent" },
    },
    "theme-border-flash": {
      className: "theme-border-flash",
      variables: { "--clippy-border-flash-color": "#FEEF69" },
    },
    "theme-lilac": {
      className: "theme-lilac",
      variables: { "--clippy-border-flash-color": "transparent" },
    },
  },
  previousClassNames: ["theme-default", "theme-border-flash", "theme-lilac"],
  persistence: "none",
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
  });

  return {
    ...DEFAULT_THEME,
    themeName: initialThemeName,
  };
}

/**
 * Get theme object with current theme name applied
 * @param themeName - Name of the theme to return (default, border-flash, lilac)
 * @returns Current theme configuration
 */
export function getTheme(themeName: "theme-default" | "theme-border-flash" | "theme-lilac"): Theme {
  return {
    ...DEFAULT_THEME,
    themeName,
  };
}

/**
 * Trigger border flash theme effect
 * Temporarily switches to border-flash theme and then restores the previous theme
 * @param wasLilac - Whether the theme was lilac before flashing (to restore later)
 */
export function triggerBorderFlashTheme(wasLilac: boolean): void {
  const currentTheme = getTheme("theme-border-flash");

  setTheme({
    ...currentTheme,
    persistence: "none",
  });

  const flashDuration = 180;
  const flashTimer = window.setTimeout(() => {
    const restoreTheme = wasLilac ? getTheme("theme-lilac") : getTheme("theme-default");
    setTheme({
      ...restoreTheme,
      persistence: "none",
    });
  }, flashDuration);
}

/**
 * Play tada audio when transitioning to lilac theme
 * Called when document becomes visible and theme is lilac
 * @param tadaAudioPath - Path to the tada audio file
 */
export function playThemeTransitionAudio(tadaAudioPath: string = "/tada.wav"): void {
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
  themeName: "theme-default" | "theme-border-flash" | "theme-lilac"
): string {
  const theme = getTheme(themeName);
  return theme.themes[themeName].variables["--clippy-border-flash-color"];
}