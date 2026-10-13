import {
  applyTheme,
  clearThemeVariables,
  setTheme,
  type ThemeDefinition,
} from "lightdni-jssas-toggle";
import { offsetFor, resolveDirection, type SlideDirection } from "./direction";
import {
  VAR_DURATION,
  VAR_FROM_X,
  VAR_FROM_Y,
  buildCss,
  injectStyle,
  removeStyle,
} from "./style";

export type PageSlideOptions = {
  /** CSS selector of the element that slides in. */
  target?: string;
  /** Class added to <html> while the theme is active. */
  themeClass?: string;
  duration?: string;
  distance?: string;
};

export type PageSlide = {
  enable(): void;
  disable(): void;
  isEnabled(): boolean;
  /**
   * Call synchronously after the destination page is committed and before
   * the browser paints (e.g. in a layout effect). Returns the direction used.
   */
  navigate(
    from: string | null,
    to: string,
    order: readonly string[],
  ): SlideDirection;
};

const THEME_NAME = "page-slide";

/**
 * Window sliding as a lightdni-jssas-toggle theme: `enable()` applies the
 * theme (class + CSS variables) and injects its stylesheet; `disable()`
 * reverses both. Knows nothing about React or routing.
 */
export function createPageSlide(options: PageSlideOptions = {}): PageSlide {
  const {
    target = ".page > .window",
    themeClass = "theme-page-slide",
    duration = "320ms",
    distance = "60px",
  } = options;
  const armedClass = `${themeClass}-armed`;
  let enabled = false;

  const theme: ThemeDefinition = {
    className: themeClass,
    variables: { [VAR_DURATION]: duration, ...toVars("down") },
  };

  function toVars(direction: SlideDirection): Record<string, string> {
    const { x, y } = offsetFor(direction, distance);
    return { [VAR_FROM_X]: x, [VAR_FROM_Y]: y };
  }

  return {
    isEnabled: () => enabled,

    enable() {
      if (enabled || typeof document === "undefined") return;
      injectStyle(document, buildCss(themeClass, armedClass, target));
      setTheme({
        themeName: THEME_NAME,
        themes: { [THEME_NAME]: theme },
        persistence: "none",
        accessibility: { setColorScheme: false },
      });
      enabled = true;
    },

    disable() {
      if (!enabled || typeof document === "undefined") return;
      applyTheme({}, { previousClassNames: [themeClass, armedClass] });
      clearThemeVariables([VAR_DURATION, VAR_FROM_X, VAR_FROM_Y]);
      removeStyle(document);
      enabled = false;
    },

    navigate(from, to, order) {
      const direction = resolveDirection(from, to, order);
      if (enabled)
        applyTheme({ className: armedClass, variables: toVars(direction) });
      return direction;
    },
  };
}
