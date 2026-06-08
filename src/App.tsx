import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ReactElement,
  type FormEvent,
} from "react";
import Markdown, { type Options as ReactMarkdownOptions } from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { ToastContainer } from "react-toastify";
import {
  attachClippyListener,
  detachClippyListener,
  onClippyClick,
  showClippyHint,
  subscribeClippyBubble,
  subscribeClippyVisibility,
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
import { PageContent, PageWithAddons } from "./components/Page";
import sections from "./sections.json";
import contacts from "./contacts.json";
import addons from "./addons.json";
import pages from "./pages.json";
import type { AddonProps } from "./components/Addon";
import type { SectionProps } from "./windowing";
import { processContent } from "./windowing/utils";
import { buildMusicGroupSchema, serializeJsonLd } from "./lib/musicSchema.ts";
import { submitResumeInterest, trackResumeEvent } from "./lib/resumeAnalytics";

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
  rehypeRaw,
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

const SHADOW_PULSE_MS = 700;

const isSoundCloudPayload = (value: unknown): value is SoundCloudPayload => {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<SoundCloudPayload>;
  return (
    Array.isArray(candidate.tracks) &&
    candidate.tracks.every(
      (track) =>
        track && typeof track.title === "string" && typeof track.url === "string",
    )
  );
};

const upsertMeta = (selector: string, attributes: Record<string, string>) => {
  let element = document.querySelector(selector) as HTMLMetaElement | null;

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

const HomePage = () => {
  const { processed, metadata } = useMemo(
    () => processContent(sections as SectionProps),
    [],
  );

  return (
    <main>
      <PageContent
        sections={processed}
        pageMetadata={{ sections: metadata }}
      />
    </main>
  );
};

const AddonsPage = () => {
  const { processed, metadata } = useMemo(
    () => processContent(addons as AddonProps),
    [],
  );

  return (
    <main>
      <PageWithAddons
        addons={processed as AddonProps}
        pageMetadata={{ sections: metadata }}
      />
    </main>
  );
};

const ContactPage = () => {
  const { processed, metadata } = useMemo(
    () => processContent(contacts as SectionProps),
    [],
  );

  return (
    <main>
      <PageContent
        sections={processed}
        pageMetadata={{ sections: metadata }}
      />
    </main>
  );
};

const ResumePage = () => {
  const RESUME_ACCESS_MODE_KEY = "resumeAccessMode";
  type ResumeAccessMode = "html" | "pdf";
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [interestEmail, setInterestEmail] = useState("");
  const [interestMessage, setInterestMessage] = useState("");
  const [isSubmittingInterest, setIsSubmittingInterest] = useState(false);
  const [printShortcutStep, setPrintShortcutStep] = useState(0);
  const [resumeAccessMode, setResumeAccessMode] =
    useState<ResumeAccessMode | null>(() => {
      const persistedMode = window.localStorage.getItem(RESUME_ACCESS_MODE_KEY);
      return persistedMode === "html" || persistedMode === "pdf"
        ? persistedMode
        : null;
    });
  const resumeIframeRef = useRef<HTMLIFrameElement | null>(null);

  const resumeDocumentPath =
    resumeAccessMode === "pdf" ? "/resume.pdf" : "/documents/resume.html";
  const hasResolvedInterestSubmission = resumeAccessMode !== null;
  const shouldBlurResume = !hasResolvedInterestSubmission;

  useEffect(() => {
    void trackResumeEvent("resume_page_view");
  }, []);

  useEffect(() => {
    if (!showResumeModal) {
      return;
    }

    const handlePrintShortcut = (event: KeyboardEvent) => {
      const isPrintShortcut =
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "p";

      if (!isPrintShortcut) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (printShortcutStep === 0) {
        const iframeWindow = resumeIframeRef.current?.contentWindow;
        if (iframeWindow) {
          iframeWindow.focus();
          iframeWindow.print();
        }
        setPrintShortcutStep(1);
        return;
      }

      window.location.assign(resumeDocumentPath);
    };

    window.addEventListener("keydown", handlePrintShortcut, true);
    return () => {
      window.removeEventListener("keydown", handlePrintShortcut, true);
    };
  }, [printShortcutStep, resumeDocumentPath, showResumeModal]);

  const handleInterestSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedEmail = interestEmail.trim();

    if (!trimmedEmail) {
      setInterestMessage("Please provide an email address.");
      return;
    }

    setIsSubmittingInterest(true);
    setInterestMessage("");

    try {
      await submitResumeInterest(trimmedEmail);
      setInterestMessage("Thanks. Your interest has been recorded.");
      setInterestEmail("");
      setResumeAccessMode("html");
      window.localStorage.setItem(RESUME_ACCESS_MODE_KEY, "html");
    } catch {
      setInterestMessage(
        "Could not submit interest right now. Please try again shortly.",
      );
    } finally {
      setIsSubmittingInterest(false);
    }
  };

  return (
    <main>
      <section className="page">
        <div className="window">
          <div className="title-bar">
            <div className="title-bar-text">Resume</div>
            <div className="title-bar-controls">
              <button aria-label="Minimize"></button>
              <button aria-label="Maximize"></button>
              <button aria-label="Close"></button>
            </div>
          </div>
          <div
            className="window-body"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              justifyContent: "center",
              alignItems: "center",
              padding: "2rem",
            }}
          >
            <button
              onClick={() => {
                void trackResumeEvent("resume_open_click");
                setPrintShortcutStep(0);
                setShowResumeModal(true);
              }}
            >
              View My Resume
            </button>
            <button onClick={() => setShowEmailModal(true)}>
              Share Interest Email
            </button>
          </div>
        </div>
      </section>

      {showResumeModal ? (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowResumeModal(false);
            }
          }}
        >
          <div
            className="window"
            style={{ width: "90vw", height: "90vh", maxWidth: "1200px" }}
          >
            <div className="title-bar">
              <div className="title-bar-text">Resume</div>
              <div className="title-bar-controls">
                <button
                  aria-label="Close"
                  onClick={() => setShowResumeModal(false)}
                ></button>
              </div>
            </div>
            <div
              className="window-body"
              style={{
                padding: 0,
                height: "calc(100% - 2rem)",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <iframe
                ref={resumeIframeRef}
                src={resumeDocumentPath}
                title="Resume"
                style={{
                  width: "100%",
                  height: "100%",
                  border: "none",
                  filter: shouldBlurResume ? "blur(7px)" : "none",
                  transition: "filter 180ms ease",
                }}
              />
              {shouldBlurResume ? (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.75rem",
                    background: "rgba(255, 255, 255, 0.2)",
                    backdropFilter: "blur(1px)",
                    padding: "1rem",
                    textAlign: "center",
                  }}
                >
                  <p style={{ margin: 0 }}>
                    Submit your interest email to unblur this preview.
                  </p>
                  <button onClick={() => setShowEmailModal(true)}>
                    Share Interest Email
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {showEmailModal ? (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowEmailModal(false);
            }
          }}
        >
          <div className="window" style={{ maxWidth: "400px", margin: "auto" }}>
            <div className="title-bar">
              <div className="title-bar-text">Resume Interest</div>
              <div className="title-bar-controls">
                <button
                  aria-label="Close"
                  onClick={() => setShowEmailModal(false)}
                ></button>
              </div>
            </div>
            <div className="window-body">
              <form
                onSubmit={handleInterestSubmit}
                style={{ display: "grid", gap: "0.5rem", margin: "0.5rem 0" }}
              >
                <label htmlFor="resume-interest-email">
                  Share your email if you are interested in this resume:
                </label>
                <input
                  id="resume-interest-email"
                  type="email"
                  value={interestEmail}
                  onChange={(event) => setInterestEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                />
                <button type="submit" disabled={isSubmittingInterest}>
                  {isSubmittingInterest ? "Submitting..." : "Submit Interest"}
                </button>
              </form>
              {interestMessage ? (
                <p style={{ margin: "0.5rem 0", fontSize: "0.9rem" }}>
                  {interestMessage}
                </p>
              ) : null}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginTop: "1rem",
                }}
              >
                <button
                  onClick={() => {
                    if (!hasResolvedInterestSubmission) {
                      setResumeAccessMode("pdf");
                      window.localStorage.setItem(RESUME_ACCESS_MODE_KEY, "pdf");
                    }
                    setShowEmailModal(false);
                  }}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
};

const WowPage = () => {
  const [username, setUsername] = useState("");
  const [date, setDate] = useState("");
  const [message, setMessage] = useState<string>("");
  const [messageType, setMessageType] = useState<"error" | "success" | "">("");

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (!username.trim()) {
      setMessageType("error");
      setMessage("Please enter a username.");
      return;
    }

    if (!date) {
      setMessageType("error");
      setMessage("Please enter a date.");
      return;
    }

    if (username.trim().toLowerCase() !== "kine") {
      setMessageType("error");
      setMessage("Invalid username.");
      return;
    }

    if (date !== today) {
      setMessageType("error");
      setMessage("Incorrect date. Please enter today's date.");
      return;
    }

    setMessageType("success");
    setMessage("Date verified! Starting download...");

    window.setTimeout(() => {
      const link = document.createElement("a");
      link.href = "/WoW_Config.zip";
      link.download = "WoW_Config.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setMessageType("success");
      setMessage("Download started successfully!");
    }, 500);
  };

  return (
    <main>
      <div style={{ maxWidth: "600px", margin: "2rem auto", padding: "1rem" }}>
        <div
          className="window"
          style={{ background: "#ece9d8", border: "2px outset #dfdfdf" }}
        >
          <div className="title-bar">
            <span className="title-bar-text">WoW Configuration Download</span>
          </div>

          <div style={{ marginBottom: "1rem", lineHeight: 1.5 }}>
            <p>
              To download the World of Warcraft configuration files, please
              enter your username and verify today's date.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "1rem" }}>
              <label
                htmlFor="usernameInput"
                style={{ display: "block", marginBottom: "0.5rem" }}
              >
                Username:
              </label>
              <input
                id="usernameInput"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Enter username"
                required
                style={{
                  width: "300px",
                  padding: "0.5rem",
                  border: "2px inset #808080",
                }}
              />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label
                htmlFor="dateInput"
                style={{ display: "block", marginBottom: "0.5rem" }}
              >
                Enter today's date:
              </label>
              <input
                id="dateInput"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                max={today}
                required
                style={{
                  width: "300px",
                  padding: "0.5rem",
                  border: "2px inset #808080",
                }}
              />
            </div>

            <button
              type="submit"
              style={{ padding: "0.5rem 1.5rem", marginRight: "0.5rem" }}
            >
              Verify & Download
            </button>
            <button
              type="button"
              style={{ padding: "0.5rem 1.5rem" }}
              onClick={() => {
                window.history.pushState({}, "", "/");
                window.dispatchEvent(new PopStateEvent("popstate"));
              }}
            >
              Cancel
            </button>

            {message ? (
              <p
                style={{
                  marginTop: "0.75rem",
                  fontWeight: "bold",
                  color: messageType === "error" ? "#c00" : "#080",
                }}
              >
                {message}
              </p>
            ) : null}
          </form>
        </div>
      </div>
    </main>
  );
};

const NotFoundPage = () => (
  <main>
    <section className="page">
      <div className="window">
        <div className="title-bar">
          <div className="title-bar-text">Not Found</div>
        </div>
        <div className="window-body">
          <p>That page does not exist.</p>
          <a href="/">Go home</a>
        </div>
      </div>
    </section>
  </main>
);

export default function App() {
  const [path, setPath] = useState(() =>
    normalizePath(window.location.pathname),
  );
  const [showClippy, setShowClippy] = useState(false);
  const [showClippyBubble, setShowClippyBubble] = useState(false);
  const [clippyBubbleSaysNo, setClippyBubbleSaysNo] = useState(false);
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
  const [isSubmitPulseActive, setIsSubmitPulseActive] = useState(false);
  const [isClippyHovered, setIsClippyHovered] = useState(false);
  const [assistantConnectionInterrupted, setAssistantConnectionInterrupted] =
    useState(false);
  const [isConnectionFlashActive, setIsConnectionFlashActive] = useState(false);
  const holdTimerRef = useRef<number | null>(null);
  const holdTriggeredRef = useRef(false);
  const connectionFlashTimerRef = useRef<number | null>(null);
  const rightClickFlashArmedRef = useRef(true);
  const wasClippyBubbleVisibleRef = useRef(false);
  // const wisdomPulseClockRef = useRef(new WisdomPulseClock());

  useEffect(() => {
    attachClippyListener();
    const unsubscribeVisibility = subscribeClippyVisibility(setShowClippy);
    const unsubscribeBubble = subscribeClippyBubble(setShowClippyBubble);
    return () => {
      unsubscribeVisibility();
      unsubscribeBubble();
      detachClippyListener();
    };
  }, []);

  useEffect(() => {
    const markDisconnected = () => {
      setAssistantConnectionInterrupted(true);
    };

    const markConnected = () => {
      setAssistantConnectionInterrupted(false);
    };

    window.addEventListener("offline", markDisconnected);
    window.addEventListener("online", markConnected);

    return () => {
      window.removeEventListener("offline", markDisconnected);
      window.removeEventListener("online", markConnected);
    };
  }, []);

  useEffect(() => {
    if (!assistantConnectionInterrupted) {
      return;
    }

    setIsConnectionFlashActive(true);
    if (connectionFlashTimerRef.current !== null) {
      window.clearTimeout(connectionFlashTimerRef.current);
    }

    connectionFlashTimerRef.current = window.setTimeout(() => {
      setIsConnectionFlashActive(false);
      setAssistantConnectionInterrupted(false);
      connectionFlashTimerRef.current = null;
    }, SHADOW_PULSE_MS);
  }, [assistantConnectionInterrupted]);

  useEffect(() => {
    const wasVisible = wasClippyBubbleVisibleRef.current;
    if (!wasVisible && showClippyBubble) {
      setClippyBubbleSaysNo(false);
    }
    wasClippyBubbleVisibleRef.current = showClippyBubble;
  }, [showClippyBubble]);

  useEffect(() => {
    const handleCrunchyKickPlayed = () => {
      if (showClippyBubble) {
        setClippyBubbleSaysNo(true);
      }
    };

    window.addEventListener("crunchy-kick-played", handleCrunchyKickPlayed);
    return () => {
      window.removeEventListener("crunchy-kick-played", handleCrunchyKickPlayed);
    };
  }, [showClippyBubble]);

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
      if (connectionFlashTimerRef.current !== null) {
        window.clearTimeout(connectionFlashTimerRef.current);
      }
      // wisdomPulseClockRef.current.stop();
    };
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

  useEffect(() => {
    const onPopState = () => {
      setPath(normalizePath(window.location.pathname));
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

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
          upsertStructuredDataScript(
            buildMusicGroupSchema(payload.tracks),
          );
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

  const navigate = (href: string) => {
    if (!isInternalPath(href)) {
      window.location.assign(href);
      return;
    }

    const current = normalizePath(window.location.pathname);
    const next = normalizePath(href);

    if (current === next && window.location.search === "") {
      return;
    }

    window.history.pushState({}, "", href);
    setPath(next);
  };

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

  const hasAssistantEndpointAndModel = () => hasConfiguredAssistant(assistantConfig);

  const triggerSubmitPulse = () => {
    setIsSubmitPulseActive(true);
    window.setTimeout(() => setIsSubmitPulseActive(false), SHADOW_PULSE_MS);
  };

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
      setAssistantConnectionInterrupted(false);
      const readyBeep = new Audio("/Beep.ogg");
      void readyBeep.play().catch(() => {});
    } catch (error) {
      setConversationError(
        error instanceof Error
          ? error.message
          : "Failed to reach configured assistant endpoint.",
      );
      setAssistantConnectionInterrupted(true);
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
  };

  const handleClippyDoubleClick = () => {
    // Wisdom-on-double-click is intentionally disabled.
  };

  useEffect(() => {
    if (!showConversationModal) {
      return;
    }

    if (!hasAssistantEndpointAndModel()) {
      setShowConversationModal(false);
      setConversationError("");
    }
  }, [assistantConfig.endpoint, assistantConfig.model, showConversationModal]);

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
    setIsConnectionFlashActive(true);

    if (connectionFlashTimerRef.current !== null) {
      window.clearTimeout(connectionFlashTimerRef.current);
    }

    connectionFlashTimerRef.current = window.setTimeout(() => {
      setIsConnectionFlashActive(false);
      connectionFlashTimerRef.current = null;
    }, SHADOW_PULSE_MS);
  };

  const handleUnavailableAssistantConfig = () => {
    triggerConnectionFlashOnce();
    onClippyClick();
    showClippyHint();
  };

  const clippyFilter = useMemo(() => buildClippyShadowFilter({
    isSubmitPulseActive,
    isConnectionFlashActive,
    showConversationModal,
    isAssistantRequestPending,
    isClippyHovered,
  }), [
    isConnectionFlashActive,
    isAssistantRequestPending,
    isClippyHovered,
    isSubmitPulseActive,
    showConversationModal,
  ]);

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
    default:
      content = <NotFoundPage />;
      break;
  }

  return (
    <>
      <MenuBar
        onNavigate={navigate}
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
            <div className="window-body" style={{ display: "grid", gap: "0.6rem" }}>
              <label htmlFor="assistant-prompt-input">Prompt (max 256 chars)</label>
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
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={handleConversationSubmit}
                  disabled={isAssistantRequestPending || !conversationInput.trim()}
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
            <div
              className="window-body"
              style={{ whiteSpace: "pre-wrap" }}
            >
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
      {showClippy ? (
        <div
          style={{
            position: "fixed",
            right: "1rem",
            bottom: "1rem",
            zIndex: 10000,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: "0.4rem",
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
                  It looks like you&apos;re trying to close something. Try clicking
                  one of the{" "}
                  <strong>✕ close buttons</strong> on the page!
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
              setIsClippyHovered(false);
            }}
            onMouseEnter={() => setIsClippyHovered(true)}
            onContextMenu={(event) => {
              event.preventDefault();
              event.stopPropagation();
              rightClickFlashArmedRef.current = true;
              handleUnavailableAssistantConfig();
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
    </>
  );
}
