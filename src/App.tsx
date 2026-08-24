import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ReactElement,
} from "react";
import Markdown, { type Options as ReactMarkdownOptions } from "react-markdown";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { ToastContainer } from "react-toastify";
import {
  setTheme,
  readPersistedThemeNameFromCookie,
} from "lightdni-jssas-toggle";
import { playLayeredAudio } from "./lib/audioOverlap";
import { onClippyClick, showClippyHint } from "./lib/keyboardInputUtils";
import {
  loadAssistantConfig,
  requestAssistantCompletion,
  type AssistantConfig,
} from "./lib/naggingAssistantClient";
import {
  buildClippyShadowFilter,
  hasConfiguredAssistant,
  type AssistantPromptOptions,
} from "./lib/assistantStateMachine";

import MenuBar, {
  CLIPPY_DROP_HREF,
  CLIPPY_DRAG_MIME,
} from "./components/MenuBar.tsx";
import BlogContent from "./components/BlogContent";
import MusicContent from "./components/MusicContent";
import SitemapContent from "./components/SitemapContent";
import { OkButton } from "./windowing/OkButton";
import { useRouting } from "./utils/routingReducer";
import { useClippy } from "./utils/clippyReducer";
import { useClippyEffect } from "./utils/clippyEffectReducer";
import pages from "../pages.json";
import { buildMusicGroupSchema, serializeJsonLd } from "./lib/musicSchema.ts";
import {
  HomePage,
  AddonsPage,
  ContactPage,
  ResumePage,
  WowPage,
  NotFoundPage,
  PagertsPage,
} from "./pages";

type RouteConfig = {
  title: string;
  description: string;
};

type SoundCloudTrack = {
  title: string;
  url: string;
};

type SoundCloudPayload = {
  tracks: SoundCloudTrack[];
};

type PageRoute = RouteConfig & {
  path: string;
};

const DEFAULT_ROUTE: RouteConfig = {
  title: "home of kine",
  description: "my cozy little personal website",
};

const PAGE_ROUTES = pages as PageRoute[];

const TOP_LEVEL_ROUTES = new Set(
  PAGE_ROUTES.map(({ path }) => path.split("/").filter(Boolean)[0]).filter(
    Boolean,
  ),
);

const ROUTE_CONFIG = Object.fromEntries(
  PAGE_ROUTES.map(({ path, title, description }) => [
    path,
    { title, description },
  ]),
) as Record<string, RouteConfig>;

const ADMIN_LOGIN_REDIRECT = "https://akinevz.com/404";
const ADMIN_LOGIN_REDIRECT_DELAY_MS = 6000;

// The "dev" door embeds the admin's public landing page in an iframe window
// below the secret page. Must be HTTPS (the host page is HTTPS) and land on
// the tailnet FQDN: only the FQDN has a browser-trusted cert (the short name
// ws-vision has none, and plain HTTP http://ws-vision:8080 only 302s here).
// The FQDN is reassembled at runtime from fragments so it never appears as a
// contiguous literal in the bundle. The admin's /login page — which needs a
// top-level tab for the passkey ceremony — is opened separately, only when the
// user actually authenticates (from the embedded landing page).
const TS_DOMAIN = ["ts", "net"].join(".");
const TAILNET_ID = ["tail", "ac72a7"].join("");
const ADMIN_FQDN = ["ws-vision", TAILNET_ID, TS_DOMAIN].join(".");
const DEV_WINDOW_IFRAME_SRC = `https://${ADMIN_FQDN}:8443/`;
// Shown in the dev window when the tailnet host is unreachable.
const DEV_WINDOW_FALLBACK_SRC = "https://akinevz.dev/";
// How long to wait for the tailnet host before falling back. AbortController
// is what enforces the timeout — no-cors resolves with an opaque response when
// the host answers and rejects (TypeError) when it's unreachable.
const DEV_PROBE_TIMEOUT_MS = 4000;

const CLIPPY_DRAG_THRESHOLD_PX = 10;
const CLIPPY_DROP_TARGET_SELECTOR = "[data-clippy-drop-target]";

type ClippyTouchDragState = {
  pointerId: number;
  startX: number;
  startY: number;
  dragging: boolean;
  ghost: HTMLImageElement | null;
};

const normalizePath = (path: string) => {
  if (!path || path === "/") {
    return "/";
  }

  const decodedPath = decodeURIComponent(path);
  const withoutIndexHtml = decodedPath.replace(/\/index\.html$/i, "/");
  const withoutHtml = withoutIndexHtml.replace(/\.html$/i, "");
  const withoutTrailingSlash = withoutHtml.replace(/\/+$/, "");
  const segments = withoutTrailingSlash.split("/").filter(Boolean);

  if (segments.length === 0) {
    return "/";
  }

  const [firstSegment] = segments;

  // Preserve /blog/login as a distinct route (don't collapse to /blog)
  // so it can redirect to the admin panel on WS-VISION.
  if (
    segments.length === 2 &&
    firstSegment?.toLowerCase() === "blog" &&
    segments[1]?.toLowerCase() === "login"
  ) {
    return "/blog/login";
  }

  if (firstSegment && TOP_LEVEL_ROUTES.has(firstSegment.toLowerCase())) {
    return `/${firstSegment.toLowerCase()}`;
  }

  return withoutTrailingSlash || "/";
};

const isInternalPath = (href: string) => href.startsWith("/");

const STRUCTURED_DATA_SCRIPT_ID = "homepage-music-structured-data";
// const ASSISTANT_CONFIG_MENU_HREF = "#assistant-config";

const markdownSanitizeSchema: unknown = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames || []), "iframe"],
  attributes: {
    ...defaultSchema.attributes,
    a: [...(defaultSchema.attributes?.a || []), ["target"], ["rel"]],
    img: [...(defaultSchema.attributes?.img || []), ["loading"], ["decoding"]],
    iframe: [
      ["title"],
      ["src"],
      ["width"],
      ["height"],
      ["style"],
      ["scrolling"],
      ["loading"],
      ["allow"],
      ["allowfullscreen"],
      ["referrerpolicy"],
      ["frameborder"],
    ],
  },
};

const markdownRehypePlugins = [
  [rehypeSanitize, markdownSanitizeSchema],
] as ReactMarkdownOptions["rehypePlugins"];

const markdownComponents = {
  img: (props: ComponentProps<"img">) => (
    <img
      {...props}
      style={{ maxWidth: "100%", height: "auto", ...(props.style ?? {}) }}
    />
  ),
};

// const TOP_BAR_ADDITIONAL_LINKS: MenuItem[] = [
//   { label: "admin", href: ASSISTANT_CONFIG_MENU_HREF },
// ];

const BORDER_FLASH_DURATION_MS = 180;
const CLIPPY_DEFAULT_THEME = "theme-default";
const CLIPPY_FLASH_THEME = "theme-border-flash";
const LILAC_THEME = "theme-lilac";
const LILAC_COOKIE_KEY = "wow-username-theme";
const CLIPPY_THEME_CLASSNAMES = [
  CLIPPY_DEFAULT_THEME,
  CLIPPY_FLASH_THEME,
  LILAC_THEME,
];
const CLIPPY_THEME_DEFINITIONS = {
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

const FEEF69_HASH = "#feef69";
const FEEF69_BACKGROUND = "#FEEF69";

const isMobilePhoneDevice = () => {
  if (typeof navigator === "undefined") {
    return false;
  }

  type NavigatorWithUserAgentData = Navigator & {
    userAgentData?: {
      mobile?: boolean;
    };
  };

  const navigatorWithUserAgentData = navigator as NavigatorWithUserAgentData;
  if (navigatorWithUserAgentData.userAgentData?.mobile) {
    return true;
  }

  const userAgent = navigator.userAgent.toLowerCase();
  return /(iphone|ipod|android.*mobile|windows phone|blackberry|iemobile|opera mini)/.test(
    userAgent,
  );
};

const isSoundCloudPayload = (value: unknown): value is SoundCloudPayload => {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<SoundCloudPayload>;
  return (
    Array.isArray(candidate.tracks) &&
    candidate.tracks.every(
      (track) =>
        track &&
        typeof track.title === "string" &&
        typeof track.url === "string",
    )
  );
};

// string -> boolean
// type Record<K extends keyof any, T> = { [P in K]: T; }

const upsertMeta = (
  selector: string,
  attributes: { [key: string]: string },
): void => {
  let element = document.querySelector(selector);

  if (!element) {
    element = document.createElement("meta");
    Object.entries(attributes).forEach(([key, value]) => {
      element?.setAttribute(key, value);
    });
    document.head.appendChild(element);
  }

  if ("content" in attributes) {
    element.setAttribute("content", attributes.content);
  }
};

const upsertCanonicalLink = (href: string) => {
  let canonical = document.querySelector(
    'link[rel="canonical"]',
  ) as HTMLLinkElement | null;
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    document.head.appendChild(canonical);
  }
  canonical.setAttribute("href", href);
};

const removeStructuredDataScript = () => {
  document.getElementById(STRUCTURED_DATA_SCRIPT_ID)?.remove();
};

const upsertStructuredDataScript = (schema: unknown) => {
  let script = document.getElementById(
    STRUCTURED_DATA_SCRIPT_ID,
  ) as HTMLScriptElement | null;

  if (!script) {
    script = document.createElement("script");
    script.id = STRUCTURED_DATA_SCRIPT_ID;
    script.type = "application/ld+json";
    document.head.appendChild(script);
  }

  script.textContent = serializeJsonLd(schema);
};

export default function App() {
  const { state: routingState, navigate } = useRouting({
    normalizePath,
    isInternalPath,
  });
  const path = routingState.path;
  const [routeHash, setRouteHash] = useState(() =>
    typeof window !== "undefined" ? window.location.hash : "",
  );

  useEffect(() => {
    const onHashChange = () => setRouteHash(window.location.hash);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const isFeef69Page = path === "/" && routeHash.toLowerCase() === FEEF69_HASH;

  const { state: clippyState } = useClippy(isMobilePhoneDevice);
  const showClippy = clippyState.showClippy;
  const showClippyBubble = clippyState.showClippyBubble;
  const clippyBubbleSaysNo = clippyState.clippyBubbleSaysNo;
  const {
    state: clippyEffectState,
    triggerSubmitPulse,
    setHovered,
    startConnectionFlash,
  } = useClippyEffect();
  const isSubmitPulseActive = clippyEffectState.isSubmitPulseActive;
  const isClippyHovered = clippyEffectState.isClippyHovered;
  const isConnectionFlashActive = clippyEffectState.isConnectionFlashActive;
  // const [showAssistantConfigModal, setShowAssistantConfigModal] = useState(false);
  const [assistantConfig] = useState<AssistantConfig>(() =>
    loadAssistantConfig(),
  );
  // const [assistantModelOptions, setAssistantModelOptions] = useState<string[]>([]);
  // const [assistantConfigError, setAssistantConfigError] = useState("");
  // const [isDiscoveringAssistantModels, setIsDiscoveringAssistantModels] =
  //   useState(false);
  const [showConversationModal, setShowConversationModal] = useState(false);
  const [showDevWindow, setShowDevWindow] = useState(false);
  const devWindowRef = useRef<HTMLDivElement | null>(null);
  const [devWindowChecking, setDevWindowChecking] = useState(false);
  const [devWindowSrc, setDevWindowSrc] = useState<string | null>(null);
  const [devWindowFallback, setDevWindowFallback] = useState(false);
  const [conversationInput, setConversationInput] = useState("");
  const [conversationError, setConversationError] = useState("");
  const [assistantWindowText, setAssistantWindowText] = useState("");
  const [assistantWindowVisible, setAssistantWindowVisible] = useState(false);
  const [assistantWindowFading, setAssistantWindowFading] = useState(false);
  const [assistantWindowMinimized, setAssistantWindowMinimized] =
    useState(false);
  const [isAssistantRequestPending, setIsAssistantRequestPending] =
    useState(false);
  const holdTimerRef = useRef<number | null>(null);
  const holdTriggeredRef = useRef(false);
  const clippyTouchDragRef = useRef<ClippyTouchDragState | null>(null);
  const clippyTouchMovedRef = useRef(false);
  const clippyDropTargetRef = useRef<HTMLElement | null>(null);
  const borderFlashTimerRef = useRef<number | null>(null);
  const rightClickFlashArmedRef = useRef(true);
  // const wisdomPulseClockRef = useRef(new WisdomPulseClock());

  useEffect(() => {
    // Restore the lilac easter-egg theme if the permanent cookie set by the
    // WoW download page (username "lg355" or "lg355@sussex.ac.uk") is present.
    const persistedLilac = readPersistedThemeNameFromCookie(LILAC_COOKIE_KEY);
    setTheme({
      themeName:
        persistedLilac === LILAC_THEME ? LILAC_THEME : CLIPPY_DEFAULT_THEME,
      themes: CLIPPY_THEME_DEFINITIONS,
      previousClassNames: CLIPPY_THEME_CLASSNAMES,
      persistence: "none",
      accessibility: {
        setColorScheme: false,
      },
    });
  }, []);

  useEffect(() => {
    // Play tada.wav when the tab/page becomes visible again (e.g. mobile
    // browser resumes looking at the website) and the lilac easter-egg
    // theme cookie is set. Does not fire for in-app navigations.
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const persistedLilac =
          readPersistedThemeNameFromCookie(LILAC_COOKIE_KEY);
        if (persistedLilac === LILAC_THEME) {
          playLayeredAudio("/tada.wav");
        }
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!isFeef69Page) return;
    const previousBackground = document.body.style.background;
    document.body.style.background = FEEF69_BACKGROUND;
    return () => {
      document.body.style.background = previousBackground;
    };
  }, [isFeef69Page]);

  // Wisdom pulse animation is disabled in production due to unresolved CORS issues.
  // useEffect(() => {
  //   if (!isWisdomRequestPending) {
  //     setWisdomPulsePhase(0);
  //     wisdomPulseClockRef.current.stop();
  //     return;
  //   }
  //
  //   wisdomPulseClockRef.current.start(() => {
  //     setWisdomPulsePhase((previous) => previous + 0.22);
  //   }, 100);
  //
  //   return () => wisdomPulseClockRef.current.stop();
  // }, [isWisdomRequestPending]);

  useEffect(() => {
    return () => {
      if (holdTimerRef.current !== null) {
        window.clearTimeout(holdTimerRef.current);
      }
      if (borderFlashTimerRef.current !== null) {
        window.clearTimeout(borderFlashTimerRef.current);
      }
      // wisdomPulseClockRef.current.stop();
    };
  }, []);

  const triggerBorderFlashTheme = useCallback(() => {
    if (borderFlashTimerRef.current !== null) {
      window.clearTimeout(borderFlashTimerRef.current);
    }

    // Capture the currently-active theme so we can restore it after the flash.
    const wasLilac =
      readPersistedThemeNameFromCookie(LILAC_COOKIE_KEY) === LILAC_THEME;

    setTheme({
      themeName: CLIPPY_FLASH_THEME,
      themes: CLIPPY_THEME_DEFINITIONS,
      previousClassNames: CLIPPY_THEME_CLASSNAMES,
      persistence: "none",
      accessibility: {
        setColorScheme: false,
      },
    });

    borderFlashTimerRef.current = window.setTimeout(() => {
      setTheme({
        themeName: wasLilac ? LILAC_THEME : CLIPPY_DEFAULT_THEME,
        themes: CLIPPY_THEME_DEFINITIONS,
        previousClassNames: CLIPPY_THEME_CLASSNAMES,
        persistence: "none",
        accessibility: {
          setColorScheme: false,
        },
      });
      borderFlashTimerRef.current = null;
    }, BORDER_FLASH_DURATION_MS);
  }, []);

  useEffect(() => {
    if (!showConversationModal) {
      return;
    }

    const handleModalEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      if (showConversationModal) {
        setShowConversationModal(false);
      }

      // if (showAssistantConfigModal) {
      //   setShowAssistantConfigModal(false);
      // }
    };

    window.addEventListener("keydown", handleModalEscape);
    return () => {
      window.removeEventListener("keydown", handleModalEscape);
    };
  }, [showConversationModal]);

  const route = ROUTE_CONFIG[path] ?? DEFAULT_ROUTE;

  // Timer for the /blog/login decoy redirect; cleared when a door is used.
  const adminLoginRedirectTimerRef = useRef<number | null>(null);

  const cancelAdminLoginRedirect = () => {
    if (adminLoginRedirectTimerRef.current !== null) {
      window.clearTimeout(adminLoginRedirectTimerRef.current);
      adminLoginRedirectTimerRef.current = null;
    }
  };

  const navigateAway = (url: string, replace = false) => {
    cancelAdminLoginRedirect();
    if (replace) {
      // Replace the current entry (the secret /blog/login page) so it never
      // reappears via the back button after the decoy navigation.
      window.location.replace(url);
    } else {
      window.location.href = url;
    }
  };

  const reEnableAdminLoginRedirect = () => {
    if (adminLoginRedirectTimerRef.current !== null) {
      return;
    }
    adminLoginRedirectTimerRef.current = window.setTimeout(() => {
      window.location.replace(ADMIN_LOGIN_REDIRECT);
    }, ADMIN_LOGIN_REDIRECT_DELAY_MS);
  };

  // The dev door: probe the tailnet host with a timeout before showing the
  // iframe. Only on-tailnet clients can reach it, so a failed probe falls back
  // to showing akinevz.dev and re-arms the decoy redirect once that has loaded.
  const handleDevDoorClick = () => {
    cancelAdminLoginRedirect();

    setDevWindowFallback(false);
    setDevWindowChecking(true);
    setDevWindowSrc(null);
    setShowDevWindow(true);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(
      () => controller.abort(),
      DEV_PROBE_TIMEOUT_MS,
    );
    void fetch(DEV_WINDOW_IFRAME_SRC, {
      mode: "no-cors",
      signal: controller.signal,
    })
      .then(() => {
        window.clearTimeout(timeoutId);
        setDevWindowChecking(false);
        setDevWindowSrc(DEV_WINDOW_IFRAME_SRC);
      })
      .catch(() => {
        window.clearTimeout(timeoutId);
        setDevWindowChecking(false);
        setDevWindowSrc(DEV_WINDOW_FALLBACK_SRC);
        setDevWindowFallback(true);
      });
  };

  const handleDevWindowLoad = () => {
    // In fallback mode, hide the secret page once the decoy content has loaded.
    if (devWindowFallback) {
      reEnableAdminLoginRedirect();
    }
  };

  // Redirect /blog/login to a decoy 404 after a delay, unless a door is used.
  // Uses replace so the secret page is dropped from the history stack.
  useEffect(() => {
    if (path !== "/blog/login" || typeof window === "undefined") {
      return;
    }
    adminLoginRedirectTimerRef.current = window.setTimeout(() => {
      window.location.replace(ADMIN_LOGIN_REDIRECT);
    }, ADMIN_LOGIN_REDIRECT_DELAY_MS);
    return () => {
      if (adminLoginRedirectTimerRef.current !== null) {
        window.clearTimeout(adminLoginRedirectTimerRef.current);
        adminLoginRedirectTimerRef.current = null;
      }
    };
  }, [path]);

  // Scroll the dev iframe window into view once it appears below the secret
  // page window.
  useEffect(() => {
    if (showDevWindow && devWindowRef.current) {
      devWindowRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [showDevWindow]);

  useEffect(() => {
    document.title = route.title;

    const canonicalUrl = new URL(path, window.location.origin).toString();
    const socialImageUrl = new URL(
      "/avatar.png",
      window.location.origin,
    ).toString();

    upsertMeta('meta[name="description"]', {
      name: "description",
      content: route.description,
    });
    upsertCanonicalLink(canonicalUrl);

    upsertMeta('meta[property="og:title"]', {
      property: "og:title",
      content: route.title,
    });
    upsertMeta('meta[property="og:description"]', {
      property: "og:description",
      content: route.description,
    });
    upsertMeta('meta[property="og:url"]', {
      property: "og:url",
      content: canonicalUrl,
    });
    upsertMeta('meta[property="og:image"]', {
      property: "og:image",
      content: socialImageUrl,
    });
    upsertMeta('meta[name="twitter:card"]', {
      name: "twitter:card",
      content: "summary",
    });
    upsertMeta('meta[name="twitter:image"]', {
      name: "twitter:image",
      content: socialImageUrl,
    });
    upsertMeta('meta[name="twitter:title"]', {
      name: "twitter:title",
      content: route.title,
    });
    upsertMeta('meta[name="twitter:description"]', {
      name: "twitter:description",
      content: route.description,
    });
  }, [path, route.title, route.description]);

  useEffect(() => {
    if (path !== "/") {
      removeStructuredDataScript();
      return;
    }

    let cancelled = false;

    const loadStructuredData = async () => {
      try {
        const response = await fetch("/soundcloud.json", {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const payload: unknown = await response.json();
        if (!isSoundCloudPayload(payload)) {
          throw new Error("Invalid SoundCloud payload schema");
        }

        if (!cancelled) {
          upsertStructuredDataScript(buildMusicGroupSchema(payload.tracks));
        }
      } catch {
        if (!cancelled) {
          removeStructuredDataScript();
        }
      }
    };

    void loadStructuredData();

    return () => {
      cancelled = true;
    };
  }, [path]);

  // const handleTopMenuAction = (href: string) => {
  //   if (href !== ASSISTANT_CONFIG_MENU_HREF) {
  //     return false;
  //   }
  //
  //   setAssistantConfigError("");
  //   setShowAssistantConfigModal(true);
  //   return true;
  // };

  // const resolvedAssistantModels = useMemo(() => {
  //   const options = new Set(assistantModelOptions);
  //   if (assistantConfig.model.trim()) {
  //     options.add(assistantConfig.model.trim());
  //   }
  //   return Array.from(options).sort((a, b) => a.localeCompare(b));
  // }, [assistantConfig.model, assistantModelOptions]);

  // const handleDiscoverAssistantModels = async () => {
  //   setAssistantConfigError("");
  //   setIsDiscoveringAssistantModels(true);
  //
  //   try {
  //     const models = await discoverAssistantModels(
  //       assistantConfig.endpoint,
  //       assistantConfig.apiKey,
  //     );
  //     const ids = models.map((model) => model.id);
  //     setAssistantModelOptions(ids);
  //
  //     if (!assistantConfig.model.trim() && ids.length > 0) {
  //       setAssistantConfig((previous) => ({
  //         ...previous,
  //         model: ids[0] ?? "",
  //       }));
  //     }
  //   } catch (error) {
  //     setAssistantConfigError(
  //       error instanceof Error
  //         ? error.message
  //         : "Failed to discover models from endpoint.",
  //     );
  //   } finally {
  //     setIsDiscoveringAssistantModels(false);
  //   }
  // };

  // const handleSaveAssistantConfig = () => {
  //   saveAssistantConfig(assistantConfig);
  //   setShowAssistantConfigModal(false);
  // };

  const hasAssistantEndpointAndModel = useCallback(
    () => hasConfiguredAssistant(assistantConfig),
    [assistantConfig],
  );

  const submitAssistantPrompt = async (
    prompt: string,
    options?: AssistantPromptOptions,
  ) => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      return;
    }

    if (!hasAssistantEndpointAndModel()) {
      if (options?.closeModalOnSubmit) {
        setConversationError("Please configure endpoint and model first.");
      }
      return;
    }

    if (assistantWindowVisible || assistantWindowText) {
      setAssistantWindowFading(true);
      await new Promise<void>((resolve) => {
        window.setTimeout(() => resolve(), 220);
      });
      setAssistantWindowVisible(false);
      setAssistantWindowText("");
      setAssistantWindowFading(false);
      setAssistantWindowMinimized(false);
    }

    if (options?.closeModalOnSubmit) {
      setShowConversationModal(false);
    }

    // const shouldPulseInTransit = shouldShowInTransitPulse(options);

    setConversationError("");
    setIsAssistantRequestPending(true);
    // if (shouldPulseInTransit) {
    //   setIsWisdomRequestPending(true);
    // }
    triggerSubmitPulse();

    try {
      const result = await requestAssistantCompletion(
        assistantConfig,
        trimmedPrompt,
        {
          conversationPrompt: !!options?.closeModalOnSubmit,
        },
      );
      setAssistantWindowText(result);
      setAssistantWindowVisible(true);
      setAssistantWindowMinimized(false);
      const readyBeep = new Audio("/Beep.ogg");
      void readyBeep.play().catch(() => {});
    } catch (error) {
      setConversationError(
        error instanceof Error
          ? error.message
          : "Failed to reach configured assistant endpoint.",
      );
      startConnectionFlash();
    } finally {
      setIsAssistantRequestPending(false);
      // if (shouldPulseInTransit) {
      //   setIsWisdomRequestPending(false);
      // }
    }
  };

  const openConversationModal = () => {
    if (!hasAssistantEndpointAndModel()) {
      handleUnavailableAssistantConfig();
      return;
    }

    setShowConversationModal(true);
    setConversationError("");
  };

  const handleClippyMouseDown = (event: React.MouseEvent<HTMLImageElement>) => {
    if (event.button !== 0) {
      return;
    }

    holdTriggeredRef.current = false;
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current);
    }

    holdTimerRef.current = window.setTimeout(() => {
      holdTriggeredRef.current = true;
      openConversationModal();
      holdTimerRef.current = null;
    }, 450);
  };

  const clearClippyHoldTimer = () => {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  const handleClippyClick = () => {
    if (holdTriggeredRef.current || clippyTouchMovedRef.current) {
      holdTriggeredRef.current = false;
      clippyTouchMovedRef.current = false;
      return;
    }

    onClippyClick();
    triggerBorderFlashTheme();
  };

  const handleClippyDoubleClick = () => {
    // Wisdom-on-double-click is intentionally disabled.
  };

  const handleClippyDragStart = (event: React.DragEvent<HTMLImageElement>) => {
    clearClippyHoldTimer();
    holdTriggeredRef.current = false;
    const clippyUrl = `${window.location.origin}/Clippy.png`;
    event.dataTransfer.setData("text/uri-list", clippyUrl);
    event.dataTransfer.setData("text/plain", clippyUrl);
    event.dataTransfer.setData(CLIPPY_DRAG_MIME, "1");
    event.dataTransfer.effectAllowed = "link";
  };

  const getClippyDropTargetAt = (x: number, y: number) =>
    document.elementFromPoint(x, y)?.closest(CLIPPY_DROP_TARGET_SELECTOR) ??
    null;

  const createClippyGhost = (): HTMLImageElement => {
    const ghost = document.createElement("img");
    ghost.src = "/Clippy.png";
    ghost.alt = "";
    ghost.style.position = "fixed";
    ghost.style.pointerEvents = "none";
    ghost.style.zIndex = "20000";
    ghost.style.width = "90px";
    ghost.style.opacity = "0.9";
    ghost.style.transform = "translate(-50%, -50%)";
    document.body.appendChild(ghost);
    return ghost;
  };

  const updateClippyDropHighlight = (x: number, y: number) => {
    const currentTarget = getClippyDropTargetAt(x, y);
    if (clippyDropTargetRef.current === currentTarget) {
      return;
    }
    clippyDropTargetRef.current?.classList.remove("clippy-drop-active");
    clippyDropTargetRef.current = currentTarget as HTMLElement | null;
    currentTarget?.classList.add("clippy-drop-active");
  };

  const clearClippyDropHighlight = () => {
    clippyDropTargetRef.current?.classList.remove("clippy-drop-active");
    clippyDropTargetRef.current = null;
  };

  const handleClippyPointerDown = (
    event: React.PointerEvent<HTMLImageElement>,
  ) => {
    if (event.pointerType === "mouse") {
      return;
    }
    clippyTouchMovedRef.current = false;
    clippyTouchDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      dragging: false,
      ghost: null,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleClippyPointerMove = (
    event: React.PointerEvent<HTMLImageElement>,
  ) => {
    const drag = clippyTouchDragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }
    if (!drag.dragging) {
      const distance = Math.hypot(
        event.clientX - drag.startX,
        event.clientY - drag.startY,
      );
      if (distance < CLIPPY_DRAG_THRESHOLD_PX) {
        return;
      }
      drag.dragging = true;
      clippyTouchMovedRef.current = true;
      clearClippyHoldTimer();
      holdTriggeredRef.current = false;
      drag.ghost = createClippyGhost();
    }
    if (drag.ghost) {
      drag.ghost.style.left = `${event.clientX}px`;
      drag.ghost.style.top = `${event.clientY}px`;
    }
    updateClippyDropHighlight(event.clientX, event.clientY);
  };

  const handleClippyPointerUp = (
    event: React.PointerEvent<HTMLImageElement>,
  ) => {
    const drag = clippyTouchDragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }
    clippyTouchDragRef.current = null;
    if (drag.ghost) {
      drag.ghost.remove();
    }
    const dropTarget = getClippyDropTargetAt(event.clientX, event.clientY);
    clearClippyDropHighlight();
    if (drag.dragging && dropTarget) {
      navigate(CLIPPY_DROP_HREF);
    }
  };

  const handleClippyPointerCancel = (
    event: React.PointerEvent<HTMLImageElement>,
  ) => {
    const drag = clippyTouchDragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }
    clippyTouchDragRef.current = null;
    if (drag.ghost) {
      drag.ghost.remove();
    }
    clearClippyDropHighlight();
  };

  const handleDismissAssistantWindow = () => {
    setAssistantWindowVisible(false);
    setAssistantWindowFading(false);
    setAssistantWindowText("");
    setAssistantWindowMinimized(false);
  };

  const handleConversationSubmit = () => {
    if (isAssistantRequestPending || !conversationInput.trim()) {
      return;
    }

    void submitAssistantPrompt(conversationInput, {
      closeModalOnSubmit: true,
    });
  };

  const triggerConnectionFlashOnce = () => {
    if (!rightClickFlashArmedRef.current) {
      return;
    }

    rightClickFlashArmedRef.current = false;
    startConnectionFlash();
  };

  const handleUnavailableAssistantConfig = () => {
    triggerConnectionFlashOnce();
    onClippyClick();
    showClippyHint();
  };

  const clippyFilter = useMemo(
    () =>
      buildClippyShadowFilter({
        isSubmitPulseActive,
        isConnectionFlashActive,
        showConversationModal,
        isAssistantRequestPending,
        isClippyHovered,
      }),
    [
      isConnectionFlashActive,
      isAssistantRequestPending,
      isClippyHovered,
      isSubmitPulseActive,
      showConversationModal,
    ],
  );

  let content: ReactElement;
  switch (path) {
    case "/":
      content = isFeef69Page ? (
        <main
          style={{
            minHeight: "100vh",
            background: FEEF69_BACKGROUND,
          }}
        />
      ) : (
        <HomePage />
      );
      break;
    case "/addons":
      content = <AddonsPage />;
      break;
    case "/blog":
      content = (
        <main>
          <BlogContent />
        </main>
      );
      break;
    case "/blog/login":
      // Hidden doors to WS-VISION services; decoy-redirects to 404 via
      // the useEffect above unless one of the doors is used.
      content = (
        <main
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1.5rem",
            paddingTop: "2rem",
          }}
        >
          <div className="window" style={{ width: "min(460px, 92vw)" }}>
            <div className="title-bar">
              <div className="title-bar-text">Secret page!</div>
              <div className="title-bar-controls">
                <button aria-label="Minimize"></button>
                <button aria-label="Maximize"></button>
                <button
                  aria-label="Close"
                  onClick={() => navigateAway(ADMIN_LOGIN_REDIRECT, true)}
                ></button>
              </div>
            </div>
            <div
              className="window-body"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
                alignItems: "center",
                padding: "1.25rem",
              }}
            >
              <section>
                <OkButton
                  onClick={() => {
                    navigateAway("http://ws-vision:3000");
                  }}
                >
                  3000
                </OkButton>
              </section>
              <section>
                <OkButton
                  onClick={() => {
                    navigateAway("http://ws-vision:8080/login");
                  }}
                >
                  8080
                </OkButton>
              </section>
              <section>
                <OkButton onClick={handleDevDoorClick}>dev</OkButton>
              </section>
            </div>
          </div>
          {showDevWindow ? (
            <div
              ref={devWindowRef}
              className="window"
              style={{ width: "min(720px, 94vw)" }}
            >
              <div className="title-bar">
                <div className="title-bar-text">ws-vision</div>
                <div className="title-bar-controls">
                  <button aria-label="Minimize"></button>
                  <button aria-label="Maximize"></button>
                  <button
                    aria-label="Close"
                    onClick={() => setShowDevWindow(false)}
                  ></button>
                </div>
              </div>
              <div className="window-body" style={{ padding: 0 }}>
                {devWindowChecking ? (
                  <p
                    style={{
                      textAlign: "center",
                      padding: "2rem",
                      margin: 0,
                    }}
                  >
                    Checking connection...
                  </p>
                ) : devWindowSrc ? (
                  <iframe
                    src={devWindowSrc}
                    title="ws-vision"
                    allow="publickey-credentials-get; publickey-credentials-create; storage-access"
                    onLoad={handleDevWindowLoad}
                    style={{
                      width: "100%",
                      height: "560px",
                      border: 0,
                      display: "block",
                    }}
                  />
                ) : null}
              </div>
            </div>
          ) : null}
        </main>
      );
      break;
    case "/music":
      content = (
        <main>
          <MusicContent />
        </main>
      );
      break;
    case "/sitemap":
      content = (
        <main>
          <SitemapContent />
        </main>
      );
      break;
    case "/contact":
      content = <ContactPage />;
      break;
    case "/resume":
      content = <ResumePage />;
      break;
    case "/wow":
      content = <WowPage />;
      break;
    case "/pagerts":
      content = <PagertsPage />;
      break;
    case "/404.html":
    default:
      content = <NotFoundPage />;
      break;
  }

  return (
    <>
      {isFeef69Page ? null : (
        <MenuBar
          onNavigate={navigate}
          currentPath={path}
          // additionalLinks={showClippy ? TOP_BAR_ADDITIONAL_LINKS : []}
          additionalLinks={[]}
          // onMenuAction={handleTopMenuAction}
        />
      )}
      {content}
      {/* Assistant config modal intentionally disabled. */}
      {/* {showAssistantConfigModal ? (
        ...
      ) : null} */}
      {showConversationModal ? (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            zIndex: 11000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowConversationModal(false);
            }
          }}
        >
          <div className="window" style={{ width: "min(560px, 92vw)" }}>
            <div className="title-bar">
              <div className="title-bar-text">Assistant Conversation</div>
              <div className="title-bar-controls">
                <button
                  aria-label="Close"
                  onClick={() => setShowConversationModal(false)}
                ></button>
              </div>
            </div>
            <div
              className="window-body"
              style={{ display: "grid", gap: "0.6rem" }}
            >
              <label htmlFor="assistant-prompt-input">
                Prompt (max 256 chars)
              </label>
              <textarea
                id="assistant-prompt-input"
                value={conversationInput}
                maxLength={256}
                onChange={(event) => setConversationInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") {
                    return;
                  }

                  event.preventDefault();
                  handleConversationSubmit();
                }}
                rows={4}
                placeholder="Ask for advice..."
              />
              <div style={{ fontSize: "0.85rem", textAlign: "right" }}>
                {conversationInput.length}/256
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "0.5rem",
                }}
              >
                <button
                  type="button"
                  onClick={handleConversationSubmit}
                  disabled={
                    isAssistantRequestPending || !conversationInput.trim()
                  }
                >
                  {isAssistantRequestPending ? "Sending..." : "Send"}
                </button>
              </div>
              {conversationError ? (
                <p style={{ margin: 0, color: "#c00" }}>{conversationError}</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
      {assistantWindowVisible || assistantWindowFading ? (
        <div
          className="window"
          style={{
            position: "fixed",
            right: "1rem",
            bottom: "9.6rem",
            width: "min(420px, 92vw)",
            zIndex: 10950,
            opacity: assistantWindowFading ? 0 : 1,
            transition: "opacity 220ms ease",
            pointerEvents: "auto",
          }}
        >
          <div className="title-bar">
            <div className="title-bar-text">Assistant Response</div>
            <div className="title-bar-controls">
              <button
                aria-label={assistantWindowMinimized ? "Maximize" : "Minimize"}
                onClick={() =>
                  setAssistantWindowMinimized((previous) => !previous)
                }
              ></button>
              <button
                aria-label="Close"
                onClick={handleDismissAssistantWindow}
              ></button>
            </div>
          </div>
          {!assistantWindowMinimized ? (
            <div className="window-body" style={{ whiteSpace: "pre-wrap" }}>
              <Markdown
                rehypePlugins={markdownRehypePlugins}
                components={markdownComponents}
              >
                {assistantWindowText}
              </Markdown>
            </div>
          ) : null}
        </div>
      ) : null}
      {showClippy && path !== "/blog" ? (
        <div
          ref={(element) => {
            if (element) {
              element.scrollIntoView({ behavior: "smooth", block: "end" });
            }
          }}
          style={{
            position: "fixed",
            right: "1rem",
            bottom: "1rem",
            zIndex: 10000,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: "0.4rem",
            animation: "clippyEnter 600ms ease-out forwards",
          }}
        >
          {showClippyBubble ? (
            <div
              style={{
                background: "#fffde7",
                border: "2px solid #aaa",
                borderRadius: "8px",
                padding: "0.5rem 0.75rem",
                maxWidth: "180px",
                fontSize: "0.8rem",
                lineHeight: 1.4,
                boxShadow: "2px 2px 6px rgba(0,0,0,0.25)",
                position: "relative",
              }}
            >
              {clippyBubbleSaysNo ? (
                "haha it said no"
              ) : (
                <>
                  It looks like you&apos;re trying to close something. Try
                  clicking one of the <strong>✕ close buttons</strong> on the
                  page!
                </>
              )}
              <span
                style={{
                  position: "absolute",
                  bottom: "-8px",
                  right: "20px",
                  width: 0,
                  height: 0,
                  borderLeft: "8px solid transparent",
                  borderRight: "8px solid transparent",
                  borderTop: "8px solid #aaa",
                }}
              />
            </div>
          ) : null}
          <img
            src="/Clippy.png"
            alt=""
            draggable
            onClick={handleClippyClick}
            onDoubleClick={handleClippyDoubleClick}
            onMouseDown={handleClippyMouseDown}
            onMouseUp={clearClippyHoldTimer}
            onDragStart={handleClippyDragStart}
            onPointerDown={handleClippyPointerDown}
            onPointerMove={handleClippyPointerMove}
            onPointerUp={handleClippyPointerUp}
            onPointerCancel={handleClippyPointerCancel}
            onMouseLeave={() => {
              clearClippyHoldTimer();
              setHovered(false);
            }}
            onMouseEnter={() => setHovered(true)}
            onContextMenu={(event) => {
              event.preventDefault();
              event.stopPropagation();
              rightClickFlashArmedRef.current = true;
              handleUnavailableAssistantConfig();
              document.documentElement.classList.add("theme-box-shadow-flash");
              window.setTimeout(
                () =>
                  document.documentElement.classList.remove(
                    "theme-box-shadow-flash",
                  ),
                180,
              );
            }}
            style={{
              width: "120px",
              maxWidth: "28vw",
              height: "auto",
              filter: clippyFilter,
              cursor: "pointer",
              transition: "filter 160ms ease",
              touchAction: "none",
            }}
          />
        </div>
      ) : null}
      <ToastContainer />
      {/* <ClosedContainerBar /> */}
    </>
  );
}
