import type React from "react";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Markdown from "react-markdown";
import { useSectionContext } from "./hooks";
import type { Content, SectionProps } from "./types";

const BLOG_POSTS_HOST =
  import.meta.env.PUBLIC_BLOG_POSTS_URL ||
  "https://raw.githubusercontent.com/akinevz2/frontend/blog-posts/";

function normalizePrintoutText(printout: string | string[]): string {
  return Array.isArray(printout) ? printout.join("\n") : printout;
}

function toFencedCodeBlock(content: string): string {
  return `\`\`\`\n${content}\n\`\`\``;
}

function PrintoutContent({ printout }: { printout: string | string[] }) {
  const [markdownContent, setMarkdownContent] = useState(() =>
    toFencedCodeBlock(normalizePrintoutText(printout)),
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadPrintout = async () => {
      if (typeof printout !== "string") {
        if (!cancelled) {
          setError(null);
          setMarkdownContent(
            toFencedCodeBlock(normalizePrintoutText(printout)),
          );
        }
        return;
      }

      const printoutUrl = new URL(printout, BLOG_POSTS_HOST).toString();

      try {
        const response = await fetch(printoutUrl, {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "text/plain, text/markdown, application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const fileContent = await response.text();
        if (!cancelled) {
          setError(null);
          setMarkdownContent(toFencedCodeBlock(fileContent));
        }
      } catch (fetchError) {
        const message =
          fetchError instanceof Error ? fetchError.message : "Unknown error";
        if (!cancelled) {
          setError(
            `Failed to fetch printout '${printout}' from BLOG_POSTS_HOST (${message}).`,
          );
          setMarkdownContent(toFencedCodeBlock(printout));
        }
      }
    };

    void loadPrintout();

    return () => {
      cancelled = true;
    };
  }, [printout]);

  return (
    <div className="debug-printout-scroll" data-debug="printout-scroll">
      <Markdown>{markdownContent}</Markdown>
      {error ? <p className="status-bar">{error}</p> : null}
    </div>
  );
}

function renderPrintout(printout: string | string[]) {
  return <PrintoutContent printout={printout} />;
}

function renderContent(content: Content, depth: number) {
  if (typeof content === "string")
    return (
      <ul>
        <li>
          <Markdown>{content}</Markdown>
        </li>
      </ul>
    );
  return (
    <ul>
      {content.map((text, index) =>
        typeof text == "string" ? (
          <li key={index}>
            <Markdown>{text}</Markdown>
          </li>
        ) : (
          <Section key={index} {...text} depth={depth + 1} />
        ),
      )}
    </ul>
  );
}

const playSound = () => {
  console.log("Close button clicked!");
  const audio = new Audio("/crunchy_kick.ogg");
  audio.play().catch((err) => alert("Error playing sound: " + err));
};

export const Section = (props: SectionProps) => {
  const {
    heading,
    content,
    printout,
    className,
    children,
    depth = 0,
    uuid,
  } = props;
  const hasHeading = !!heading;
  const hasContent = !!content;
  const hasPrintout =
    printout !== undefined &&
    ((typeof printout === "string" && printout.length > 0) ||
      (Array.isArray(printout) && printout.length > 0));
  const isRootSection = depth === 0;
  const [isMaximized, setIsMaximized] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isOverfullPost, setIsOverfullPost] = useState(false);
  const isRootExpanded = isRootSection && !isCollapsed;
  const rootWindowStyle: React.CSSProperties | undefined = isRootExpanded
    ? {
        width: "min(100vw - 2rem, 100%)",
        maxWidth: "100%",
        boxSizing: "border-box",
      }
    : undefined;
  const rootWindowBodyStyle: React.CSSProperties | undefined = isRootExpanded
    ? {
        overflowX: "auto",
      }
    : undefined;
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);
  const inlineRootWindowRef = useRef<HTMLDivElement>(null);
  const maximizedRootWindowRef = useRef<HTMLDivElement>(null);
  const { markAsExpanded, minimizeSection, minimizedSections } =
    useSectionContext();

  // UUID must be provided from server-side processing
  if (!uuid) {
    console.error("Section missing UUID:", { heading, depth });
  }
  const sectionUUID = uuid || `fallback-${heading}-${depth}`;
  const isMinimized = minimizedSections.has(sectionUUID);
  const rootModeActive = isRootExpanded && !isMinimized && isOverfullPost;
  const rootMobilePrintoutActive =
    isRootExpanded && !isMinimized && hasPrintout;

  useEffect(() => {
    if (!isRootSection) return;

    const evaluateOverflow = () => {
      if (!isRootExpanded || isMinimized) {
        setIsOverfullPost(false);
        return;
      }

      const rootWindow = isMaximized
        ? maximizedRootWindowRef.current
        : inlineRootWindowRef.current;

      if (!rootWindow) {
        setIsOverfullPost(false);
        return;
      }

      const body = rootWindow.querySelector(
        ".window-body",
      ) as HTMLElement | null;
      if (!body) {
        setIsOverfullPost(false);
        return;
      }

      let overfull = body.scrollWidth > body.clientWidth + 1;

      if (!overfull) {
        const scrollables = body.querySelectorAll(".debug-printout-scroll");
        scrollables.forEach((node) => {
          const el = node as HTMLElement;
          if (el.scrollWidth > el.clientWidth + 1) {
            overfull = true;
          }
        });
      }

      setIsOverfullPost(overfull);
    };

    const frame = requestAnimationFrame(evaluateOverflow);
    window.addEventListener("resize", evaluateOverflow);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", evaluateOverflow);
    };
  }, [
    isRootSection,
    isRootExpanded,
    isMinimized,
    isMaximized,
    content,
    printout,
  ]);

  useEffect(() => {
    if (!isRootSection || typeof document === "undefined") return;

    const root = document.documentElement;
    root.classList.toggle("overfull-post-active", rootModeActive);
    root.classList.toggle("mobile-printout-expanded", rootMobilePrintoutActive);

    return () => {
      root.classList.remove("overfull-post-active");
      root.classList.remove("mobile-printout-expanded");
    };
  }, [isRootSection, rootModeActive, rootMobilePrintoutActive]);

  // Debug logging
  console.log("Section render:", {
    heading,
    hasContent,
    hasPrintout,
    isCollapsed,
    isMinimized,
    isMaximized,
    uuid: sectionUUID,
    depth,
  });

  const handleMinimize = () => {
    if (heading && typeof heading === "string") {
      // Close maximized window before minimizing
      if (isMaximized) {
        setIsMaximized(false);
      }
      minimizeSection(sectionUUID, heading);
    }
  };

  const handleMaximize = () => {
    setIsMaximized(!isMaximized);
  };

  const handleClose = () => {
    if (isMaximized) {
      setIsMaximized(false);
    } else {
      playSound();
    }
  };

  const handleExpand = () => {
    setIsCollapsed(false);
    if (heading && typeof heading === "string") {
      markAsExpanded(heading);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".title-bar-controls")) {
      return; // Don't drag when clicking window controls
    }
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && isMaximized) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset, isMaximized]);

  // Center the window when first maximized
  useEffect(() => {
    if (
      isMaximized &&
      windowRef.current &&
      position.x === 0 &&
      position.y === 0
    ) {
      const rect = windowRef.current.getBoundingClientRect();
      setPosition({
        x: (window.innerWidth - rect.width) / 2,
        y: (window.innerHeight - rect.height) / 2,
      });
    }
  }, [isMaximized, position.x, position.y]);

  const rootWindowClassName = [
    "window",
    className || "",
    isRootSection ? "root-window" : "",
    rootModeActive ? "root-overfull-window" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const windowContent = (
    <div
      ref={isRootSection ? inlineRootWindowRef : undefined}
      className={rootWindowClassName}
      style={rootWindowStyle}
    >
      {hasHeading ? (
        <div className="title-bar">
          <div className="title-bar-text">{heading}</div>
          <div className="title-bar-controls">
            <button aria-label="Minimize" onClick={handleMinimize}></button>
            {depth !== 0 && (
              <button aria-label="Maximize" onClick={handleMaximize}></button>
            )}
            <button aria-label="Close" onClick={handleClose}></button>
          </div>
        </div>
      ) : null}
      <div className="window-body" style={rootWindowBodyStyle}>
        {isCollapsed ? (
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={handleExpand}>OK</button>
          </div>
        ) : (
          <>
            {hasPrintout ? renderPrintout(printout) : null}
            {hasContent ? renderContent(content, depth) : null}
            {children}
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      {!isMinimized && !isMaximized && windowContent}
      {!isMinimized &&
        isMaximized &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.3)",
              zIndex: 9998,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={(e) => {
              // Close when clicking backdrop
              if (e.target === e.currentTarget) {
                setIsMaximized(false);
              }
            }}
          >
            <div
              ref={windowRef}
              style={{
                position: "absolute",
                left: `${position.x}px`,
                top: `${position.y}px`,
                zIndex: 9999,
                maxWidth: "90vw",
                maxHeight: "90vh",
                overflow: "auto",
                cursor: isDragging ? "grabbing" : "default",
              }}
            >
              <div
                ref={isRootSection ? maximizedRootWindowRef : undefined}
                className={rootWindowClassName}
                style={{
                  cursor: "default",
                  ...rootWindowStyle,
                }}
              >
                {hasHeading ? (
                  <div
                    className="title-bar"
                    style={{ cursor: "grab" }}
                    onMouseDown={handleMouseDown}
                  >
                    <div className="title-bar-text">{heading}</div>
                    <div className="title-bar-controls">
                      <button
                        aria-label="Minimize"
                        onClick={handleMinimize}
                      ></button>
                      <button
                        aria-label="Maximize"
                        onClick={handleMaximize}
                      ></button>
                      <button aria-label="Close" onClick={handleClose}></button>
                    </div>
                  </div>
                ) : null}
                <div className="window-body" style={rootWindowBodyStyle}>
                  {isCollapsed ? (
                    <div
                      style={{ display: "flex", justifyContent: "flex-end" }}
                    >
                      <button onClick={handleExpand}>OK</button>
                    </div>
                  ) : (
                    <>
                      {hasPrintout ? renderPrintout(printout) : null}
                      {hasContent ? renderContent(content, depth) : null}
                      {children}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};
