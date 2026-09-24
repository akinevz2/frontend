import { useCallback, useEffect, useRef, useState } from "react";
import { ToastContainer } from "react-toastify";
import { setTheme, readPersistedThemeNameFromCookie } from "lightdni-jssas-toggle";
import { playLayeredAudio } from "./lib/audioOverlap";
import { onClippyClick, showClippyHint } from "./lib/keyboardInputUtils";
import { AssistantConversationModal } from "./components/assistant";
import { AssistantResponseWindow } from "./components/assistant";
import { OkButton } from "./windowing/OkButton";
import MenuBar from "./components/MenuBar.tsx";
import { BlogContent, MusicContent, SitemapContent } from "./components";
import { HomePage, AddonsPage, ContactPage, ResumePage, WowPage, NotFoundPage, PagertsPage } from "./pages";
import { upsertMeta, upsertCanonicalLink } from "./utils/appConstants";
import { ADMIN_LOGIN_REDIRECT, ADMIN_LOGIN_REDIRECT_DELAY_MS, CLIPPY_DROP_HREF } from "./utils/appConstants";

export default function App() {
  const navigate = useCallback((href: string) => {
    window.location.href = href;
  }, []);

  const [path, setPath] = useState("");

  const clippyFilterRef = useRef("none");

  const [showConversationModal, setShowConversationModal] = useState(false);
  const [assistantWindowText, setAssistantWindowText] = useState("");
  const [assistantWindowVisible, setAssistantWindowVisible] = useState(false);
  const [assistantWindowFading, setAssistantWindowFading] = useState(false);
  const [assistantWindowMinimized, setAssistantWindowMinimized] = useState(false);
  const [conversationInput, setConversationInput] = useState("");
  const [isAssistantRequestPending, setIsAssistantRequestPending] = useState(false);

  const [showDevWindow, setShowDevWindow] = useState(false);
  const devWindowRef = useRef<HTMLDivElement | null>(null);
  const [devWindowChecking, setDevWindowChecking] = useState(false);
  const [devWindowSrc, setDevWindowSrc] = useState<string | null>(null);
  const [devWindowFallback, setDevWindowFallback] = useState(false);
  const adminLoginRedirectTimerRef = useRef<number | null>(null);
  const borderFlashTimerRef = useRef<number | null>(null);
  const holdTimerRef = useRef<number | null>(null);
  const holdTriggeredRef = useRef(false);
  const clippyTouchDragRef = useRef<any>(null);
  const clippyTouchMovedRef = useRef(false);
  const clippyDropTargetRef = useRef<HTMLElement | null>(null);
  const rightClickFlashArmedRef = useRef(true);

  const isFeef69Page = window.location.hash === "#feef69";

  useEffect(() => {
    const persistedLilac = readPersistedThemeNameFromCookie("wow-username-theme");
    setTheme({
      themeName:
        persistedLilac === "theme-lilac" ? "theme-lilac" : "theme-default",
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
    });
  }, []);

  useEffect(() => {
    if (document.visibilityState === "visible") {
      const persistedLilac = readPersistedThemeNameFromCookie("wow-username-theme");
      if (persistedLilac === "theme-lilac") {
        playLayeredAudio("/tada.wav");
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      if (holdTimerRef.current !== null) {
        window.clearTimeout(holdTimerRef.current);
      }
      if (borderFlashTimerRef.current !== null) {
        window.clearTimeout(borderFlashTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("feef69-page", isFeef69Page);
  }, [isFeef69Page]);

  const triggerBorderFlashTheme = useCallback(() => {
    if (borderFlashTimerRef.current !== null) {
      window.clearTimeout(borderFlashTimerRef.current);
    }

    const wasLilac = readPersistedThemeNameFromCookie("wow-username-theme") === "theme-lilac";

    setTheme({
      themeName: "theme-border-flash",
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
    });

    borderFlashTimerRef.current = window.setTimeout(() => {
      setTheme({
        themeName: wasLilac ? "theme-lilac" : "theme-default",
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
      });
      borderFlashTimerRef.current = null;
    }, 180);
  }, []);

  useEffect(() => {
    if (!showConversationModal) return;

    const handleModalEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowConversationModal(false);
      }
    };

    window.addEventListener("keydown", handleModalEscape);
    return () => {
      window.removeEventListener("keydown", handleModalEscape);
    };
  }, [showConversationModal]);

  useEffect(() => {
    document.title = "home of kine";

    const canonicalUrl = new URL(path, window.location.origin).toString();
    const socialImageUrl = new URL("/avatar.png", window.location.origin).toString();

    upsertMeta('meta[name="description"]', {
      name: "description",
      content: "my cozy little personal website",
    });
    upsertCanonicalLink(canonicalUrl);

    upsertMeta('meta[property="og:title"]', { property: "og:title", content: "home of kine" });
    upsertMeta('meta[property="og:description"]', { property: "og:description", content: "my cozy little personal website" });
    upsertMeta('meta[property="og:url"]', { property: "og:url", content: canonicalUrl });
    upsertMeta('meta[property="og:image"]', { property: "og:image", content: socialImageUrl });
    upsertMeta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary" });
    upsertMeta('meta[name="twitter:image"]', { name: "twitter:image", content: socialImageUrl });
    upsertMeta('meta[name="twitter:title"]', { name: "twitter:title", content: "home of kine" });
    upsertMeta('meta[name="twitter:description"]', { name: "twitter:description", content: "my cozy little personal website" });
  }, [path]);

  const cancelAdminLoginRedirect = () => {
    if (adminLoginRedirectTimerRef.current !== null) {
      window.clearTimeout(adminLoginRedirectTimerRef.current);
      adminLoginRedirectTimerRef.current = null;
    }
  };

  const navigateAway = (url: string, replace = false) => {
    cancelAdminLoginRedirect();
    if (replace) {
      window.location.replace(url);
    } else {
      window.location.href = url;
    }
  };

  const reEnableAdminLoginRedirect = () => {
    if (adminLoginRedirectTimerRef.current !== null) return;
    adminLoginRedirectTimerRef.current = window.setTimeout(() => {
      window.location.replace(ADMIN_LOGIN_REDIRECT);
    }, ADMIN_LOGIN_REDIRECT_DELAY_MS);
  };

  useEffect(() => {
    if (path !== "/blog/login" || typeof window === "undefined") return;
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

  useEffect(() => {
    if (showDevWindow && devWindowRef.current) {
      devWindowRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [showDevWindow]);

  const triggerConnectionFlashOnce = () => {
    if (!rightClickFlashArmedRef.current) return;
    rightClickFlashArmedRef.current = false;
    document.documentElement.classList.add("theme-box-shadow-flash");
    window.setTimeout(() => {
      document.documentElement.classList.remove("theme-box-shadow-flash");
    }, 180);
  };

  const handleUnavailableAssistantConfig = () => {
    triggerConnectionFlashOnce();
    onClippyClick();
    showClippyHint();
  };

  const submitAssistantPrompt = async (_prompt: string, _options?: any) => {
    if (assistantWindowVisible || assistantWindowText) {
      setIsAssistantRequestPending(true);
      setAssistantWindowText("Response from assistant...");
      setAssistantWindowVisible(true);
      setAssistantWindowMinimized(false);
      const readyBeep = new Audio("/Beep.ogg");
      void readyBeep.play().catch(() => {});
    }
  };

  const handleClippyMouseDown = (event: React.MouseEvent<HTMLImageElement>) => {
    if (event.button !== 0) return;
    holdTriggeredRef.current = true;
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

  const handleClippyDragStart = (event: React.DragEvent<HTMLImageElement>) => {
    clearClippyHoldTimer();
    holdTriggeredRef.current = false;
    const clippyUrl = `${window.location.origin}/Clippy.png`;
    event.dataTransfer.setData("text/uri-list", clippyUrl);
    event.dataTransfer.setData("text/plain", clippyUrl);
    event.dataTransfer.setData("application/x-clippy-drag", "1");
    event.dataTransfer.effectAllowed = "link";
  };

  const getClippyDropTargetAt = (x: number, y: number) =>
    document.elementFromPoint(x, y)?.closest(".clippy-drop-target") ?? null;

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
    if (clippyDropTargetRef.current === currentTarget) return;
    clippyDropTargetRef.current?.classList.remove("clippy-drop-active");
    clippyDropTargetRef.current = currentTarget as HTMLElement | null;
    currentTarget?.classList.add("clippy-drop-active");
  };

  const clearClippyDropHighlight = () => {
    clippyDropTargetRef.current?.classList.remove("clippy-drop-active");
    clippyDropTargetRef.current = null;
  };

  const handleClippyPointerDown = (event: React.PointerEvent<HTMLImageElement>) => {
    if (event.pointerType === "mouse") return;
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

  const handleClippyPointerMove = (event: React.PointerEvent<HTMLImageElement>) => {
    const drag = clippyTouchDragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (!drag.dragging) {
      const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
      if (distance < 10) return;
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

  const handleClippyPointerUp = (event: React.PointerEvent<HTMLImageElement>) => {
    const drag = clippyTouchDragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    clippyTouchDragRef.current = null;
    if (drag.ghost) drag.ghost.remove();
    const dropTarget = getClippyDropTargetAt(event.clientX, event.clientY);
    clearClippyDropHighlight();
    if (drag.dragging && dropTarget) {
      navigate(CLIPPY_DROP_HREF);
    }
  };

  const handleClippyPointerCancel = (event: React.PointerEvent<HTMLImageElement>) => {
    const drag = clippyTouchDragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    clippyTouchDragRef.current = null;
    if (drag.ghost) drag.ghost.remove();
    clearClippyDropHighlight();
  };

  const handleConversationSubmit = () => {
    if (isAssistantRequestPending || !conversationInput.trim()) return;
    void submitAssistantPrompt(conversationInput, {
      closeModalOnSubmit: true,
    });
  };

  useEffect(() => {
    const handleRightClick = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      rightClickFlashArmedRef.current = true;
      handleUnavailableAssistantConfig();
      document.documentElement.classList.add("theme-box-shadow-flash");
      window.setTimeout(() => {
        document.documentElement.classList.remove("theme-box-shadow-flash");
      }, 180);
    };
    window.addEventListener("contextmenu", handleRightClick);
    return () => {
      window.removeEventListener("contextmenu", handleRightClick);
    };
  }, []);

  let content: React.ReactElement;
  switch (path) {
    case "/":
      content = isFeef69Page ? <main className="feef69-page" /> : <HomePage />;
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
                <button aria-label="Minimize" />
                <button aria-label="Maximize" />
                <button
                  aria-label="Close"
                  onClick={() => navigateAway(ADMIN_LOGIN_REDIRECT, true)}
                />
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
                <OkButton onClick={() => navigateAway("http://ws-vision:3000")}>
                  3000
                </OkButton>
              </section>
              <section>
                <OkButton onClick={() => navigateAway("http://ws-vision:8080/login")}>
                  8080
                </OkButton>
              </section>
              <section>
                <OkButton onClick={() => setShowDevWindow(true)}>dev</OkButton>
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
                  <button aria-label="Minimize" />
                  <button aria-label="Maximize" />
                  <button
                    aria-label="Close"
                    onClick={() => setShowDevWindow(false)}
                  />
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
                    onLoad={() => {
                      if (devWindowFallback) reEnableAdminLoginRedirect();
                    }}
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
          additionalLinks={[]}
        />
      )}
      {content}
      {showConversationModal && (
        <AssistantConversationModal
          isOpen={showConversationModal}
          onClose={() => setShowConversationModal(false)}
        />
      )}
      {(assistantWindowVisible || assistantWindowFading) && (
        <AssistantResponseWindow
          isVisible={assistantWindowVisible || assistantWindowFading}
          isFading={assistantWindowFading}
          isMinimized={assistantWindowMinimized}
          text={assistantWindowText}
          onMinimize={() => setAssistantWindowMinimized(false)}
          onClose={() => setAssistantWindowVisible(false)}
        />
      )}
      <img
        src="/Clippy.png"
        alt=""
        draggable
        onClick={handleClippyClick}
        onDoubleClick={() => {}}
        onMouseDown={handleClippyMouseDown}
        onMouseUp={clearClippyHoldTimer}
        onDragStart={handleClippyDragStart}
        onPointerDown={handleClippyPointerDown}
        onPointerMove={handleClippyPointerMove}
        onPointerUp={handleClippyPointerUp}
        onPointerCancel={handleClippyPointerCancel}
        style={{
          width: "120px",
          maxWidth: "28vw",
          height: "auto",
          cursor: "pointer",
          transition: "filter 160ms ease",
        }}
      />
      <ToastContainer />
    </>
  );
}