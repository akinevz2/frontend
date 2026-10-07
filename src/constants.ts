export const ABSOLUTE_HOST = "https://akinevz.com/";
export const ABSOLUTE_HOST_DEV = "http://localhost:8086/";
export type Route = {
  title: string;
  description: string;
};

export type RouteWithPath = Route & {
  path: string;
};

export const DEFAULT_ROUTE: Route = {
  title: "home of kine",
  description: "my cozy little personal website",
};

export const PAGE_ROUTES: RouteWithPath[] = [];

export const ROUTE_CONFIG: Record<string, Route> = {};
export const ADMIN_LOGIN_REDIRECT = "https://akinevz.com/404";
export const ADMIN_LOGIN_REDIRECT_DELAY_MS = 6000;
export const DEV_WINDOW_IFRAME_SRC = "";
export const DEV_WINDOW_FALLBACK_SRC = "";
export const DEV_PROBE_TIMEOUT_MS = 4000;
export const CLIPPY_DRAG_MIME = "application/x-clippy-drag";
export const CLIPPY_DROP_HREF = "#";
export const STRUCTURED_DATA_SCRIPT_ID = "homepage-music-structured-data";
export const LILAC_COOKIE_KEY = "wow-username-theme";
export const CLIPPY_DEFAULT_THEME = "theme-default";
export const CLIPPY_FLASH_THEME = "theme-border-flash";
export const LILAC_THEME = "theme-lilac";
export const BORDER_FLASH_DURATION_MS = 180;
export const CLIPPY_DRAG_THRESHOLD_PX = 10;
export const CLIPPY_THEME_CLASSNAMES = [
  CLIPPY_DEFAULT_THEME,
  CLIPPY_FLASH_THEME,
  LILAC_THEME,
];
export const CLIPPY_THEME_DEFINITIONS = {
  [CLIPPY_DEFAULT_THEME]: {
    className: CLIPPY_DEFAULT_THEME,
    variables: {
      "--clippy-border-flash-color": "transparent",
    },
  },
  [CLIPPY_FLASH_THEME]: {
    className: CLIPPY_FLASH_THEME,
    variables: {
      "--clippy-border-flash-color": "#FEEF69",
    },
  },
  [LILAC_THEME]: {
    className: LILAC_THEME,
    variables: {
      "--clippy-border-flash-color": "transparent",
    },
  },
} as const;
export const FEEF69_HASH = "#feef69";

export type ClippyTouchDragState = {
  pointerId: number;
  startX: number;
  startY: number;
  dragging: boolean;
  ghost: HTMLImageElement | null;
};
