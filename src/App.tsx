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
import { setTheme } from "lightdni-jssas-toggle";
import {
  onClippyClick,
  showClippyHint,
} from "./lib/keyboardInputUtils";
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

import MenuBar from "./components/MenuBar.tsx";
import BlogContent from "./components/BlogContent";
import MusicContent from "./components/MusicContent";
import SitemapContent from "./components/SitemapContent";
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
const CLIPPY_THEME_CLASSNAMES = [CLIPPY_DEFAULT_THEME, CLIPPY_FLASH_THEME];
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
} as const;

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
  const { state: clippyState } = useClippy(isMobilePhoneDevice);
  const showClippy = clippyState.showClippy;
  const showClippyBubble = clippyState.showClippyBubble;
  const clippyBubbleSaysNo = clippyState.clippyBubbleSaysNo;
  const { state: clippyEffectState, triggerSubmitPulse, setHovered, startConnectionFlash } =
    useClippyEffect();
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
  const borderFlashTimerRef = useRef<number | null>(null);
  const rightClickFlashArmedRef = useRef(true);
  // const wisdomPulseClockRef = useRef(new WisdomPulseClock());

  useEffect(() => {
    setTheme({
      themeName: CLIPPY_DEFAULT_THEME,
      themes: CLIPPY_THEME_DEFINITIONS,
      previousClassNames: CLIPPY_THEME_CLASSNAMES,
      persistence: "none",
      accessibility: {
        setColorScheme: false,
      },
    });
  }, []);

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
        themeName: CLIPPY_DEFAULT_THEME,
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
      void readyBeep.play().catch(() => { });
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
    if (holdTriggeredRef.current) {
      holdTriggeredRef.current = false;
      return;
    }

    onClippyClick();
    triggerBorderFlashTheme();
  };

  const handleClippyDoubleClick = () => {
    // Wisdom-on-double-click is intentionally disabled.
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
      content = <HomePage />;
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
    case "/404.html":
    default:
      content = <NotFoundPage />;
      break;
  }

  return (
    <>
      <MenuBar
        onNavigate={navigate}
        currentPath={path}
        // additionalLinks={showClippy ? TOP_BAR_ADDITIONAL_LINKS : []}
        additionalLinks={[]}
      // onMenuAction={handleTopMenuAction}
      />
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
            onClick={handleClippyClick}
            onDoubleClick={handleClippyDoubleClick}
            onMouseDown={handleClippyMouseDown}
            onMouseUp={clearClippyHoldTimer}
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
            }}
          />
        </div>
      ) : null}
      <ToastContainer />
      {/* <ClosedContainerBar /> */}
    </>
  );
}
