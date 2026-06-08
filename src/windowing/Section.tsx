import type React from "react";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Markdown, { type Options as ReactMarkdownOptions } from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { playLayeredAudio } from "../lib/audioOverlap";
import { useSectionContext } from "./hooks";
import type { Content, HttpUrl, SectionProps } from "./types";
import {
  getSafeBlogPostsHost,
  resolveTrustedBlogAssetUrl,
} from "../utils/blogSecurity";

const BLOG_PATH = "/blog";
const env = import.meta.env as Record<string, string | undefined>;
const BLOG_POSTS_HOST = getSafeBlogPostsHost(
  env.VITE_BLOG_POSTS_URL || env.PUBLIC_BLOG_POSTS_URL,
  env.VITE_ALLOWED_BLOG_HOSTS || env.PUBLIC_ALLOWED_BLOG_HOSTS,
);

const isBlogPath = (pathname: string) => pathname.replace(/\/+$/, "") === BLOG_PATH;

const toPostSlug = (heading: string) =>
  heading
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const contentContainsPostSlug = (
  content: Content,
  targetPostSlug: string,
): boolean => {
  if (typeof content === "string") {
    return false;
  }

  return content.some((item): boolean => {
    if (typeof item === "string") {
      return false;
    }

    if (typeof item.heading === "string" && toPostSlug(item.heading) === targetPostSlug) {
      return true;
    }

    return !!item.content && contentContainsPostSlug(item.content as Content, targetPostSlug);
  });
};

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
  img: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    <img
      {...props}
      style={{ maxWidth: "100%", height: "auto", ...(props.style ?? {}) }}
    />
  ),
};

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
          setMarkdownContent(toFencedCodeBlock(normalizePrintoutText(printout)));
        }
        return;
      }

      let printoutUrl: string;
      try {
        printoutUrl = resolveTrustedBlogAssetUrl(printout, BLOG_POSTS_HOST);
      } catch (urlError) {
        const message =
          urlError instanceof Error ? urlError.message : "Unknown error";
        if (!cancelled) {
          setError(message);
          setMarkdownContent(toFencedCodeBlock(printout));
        }
        return;
      }

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
            `Failed to fetch printout '${printout}' from trusted blog host (${message}).`,
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
          <Markdown
            rehypePlugins={markdownRehypePlugins}
            components={markdownComponents}
          >
            {content}
          </Markdown>
        </li>
      </ul>
    );
  return (
    <ul>
      {content.map((text, index) =>
        typeof text == "string" ? (
          <li key={index}>
            <Markdown
              rehypePlugins={markdownRehypePlugins}
              components={markdownComponents}
            >
              {text}
            </Markdown>
          </li>
        ) : (
          <Section key={index} {...text} depth={depth + 1} />
        ),
      )}
    </ul>
  );
}

function isValidHttpUrl(link: string): link is HttpUrl {
  try {
    const parsed = new URL(link);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

const playSound = () => {
  playLayeredAudio("/crunchy_kick.ogg");
};

export const Section = (props: SectionProps) => {
  const {
    heading,
    content,
    link,
    printout,
    className,
    children,
    depth = 0,
    uuid,
  } = props;
  const hasHeading = !!heading;
  const hasContent = !!content;
  const hasLink = typeof link === "string" && link.length > 0;
  const hasPrintout =
    printout !== undefined &&
    ((typeof printout === "string" && printout.length > 0) ||
      (Array.isArray(printout) && printout.length > 0));
  const isOnBlogPage =
    typeof window !== "undefined" && isBlogPath(window.location.pathname);
  const rawTargetPostSlug =
    typeof window !== "undefined" && isOnBlogPage
      ? new URLSearchParams(window.location.search).get("post") || ""
      : "";
  const targetPostSlug = rawTargetPostSlug ? toPostSlug(rawTargetPostSlug) : "";
  const isBlogPost = depth > 0 && typeof heading === "string";
  const isLinkableBlogPost = isOnBlogPage && isBlogPost;
  const postSlug = isLinkableBlogPost ? toPostSlug(heading) : "";
  const permalink = isLinkableBlogPost
    ? `${BLOG_PATH}/?post=${encodeURIComponent(postSlug)}`
    : "";
  const shouldOpenFromLink =
    typeof window !== "undefined" &&
    isLinkableBlogPost &&
    targetPostSlug === postSlug;
  const shouldRevealLinkedPost =
    isOnBlogPage &&
    !!targetPostSlug &&
    !!content &&
    contentContainsPostSlug(content as Content, targetPostSlug);
  const isForcedExpanded = shouldOpenFromLink || shouldRevealLinkedPost || hasPrintout;

  const [isMaximized, setIsMaximized] = useState(shouldOpenFromLink);
  const [isCollapsed, setIsCollapsed] = useState(!isForcedExpanded);
  const isCollapsedResolved = isForcedExpanded ? false : isCollapsed;
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);
  const { markAsExpanded, minimizeSection, minimizedSections, restoreSection } =
    useSectionContext();

  // UUID must be provided from server-side processing
  if (!uuid) {
    // UUID must be provided from server-side processing; fall back silently.
  }
  const sectionUUID = uuid || `fallback-${heading}-${depth}`;
  const isMinimized = minimizedSections.has(sectionUUID);

  const clearPostSlugFromUrl = () => {
    if (typeof window === "undefined" || !isOnBlogPage || !isLinkableBlogPost) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get("post") !== postSlug) {
      return;
    }

    params.delete("post");
    const search = params.toString();
    const nextUrl = `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", nextUrl);
  };

  const minimizePoppedOutWindow = () => {
    setIsMaximized(false);

    if (heading && typeof heading === "string") {
      minimizeSection(sectionUUID, heading);
    }
  };

  const closePoppedOutWindow = () => {
    setIsMaximized(false);
    clearPostSlugFromUrl();
    // Closing should not leave an entry in the minimized windows menu.
    restoreSection(sectionUUID);
  };



  const handleMinimize = () => {
    if (heading && typeof heading === "string") {
      // Close maximized window before minimizing
      if (isMaximized) {
        minimizePoppedOutWindow();
        return;
      }

      minimizeSection(sectionUUID, heading);
    }
  };

  const handleMaximize = () => {
    setIsMaximized(!isMaximized);
  };

  const handleClose = () => {
    if (isMaximized) {
      closePoppedOutWindow();
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

  const handlePrimaryAction = () => {
    if (hasLink && isValidHttpUrl(link)) {
      window.location.assign(link);
      return;
    }

    handleExpand();
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

  const windowContent = (
    <div className={`window ${className || ""}`}>
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
      <div className="window-body">
        {isCollapsedResolved ? (
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={handlePrimaryAction}>OK</button>
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
              top: "var(--menu-bar-height, 24px)",
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
                position: "fixed",
                left: `${position.x}px`,
                top: `${position.y}px`,
                zIndex: 9999,
                maxWidth: "90vw",
                maxHeight: "90vh",
                cursor: isDragging ? "grabbing" : "default",
              }}
            >
              <div
                className={`window ${className || ""}`}
                style={{
                  cursor: "default",
                  maxWidth: "100%",
                  maxHeight: "100%",
                  boxSizing: "border-box",
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
                <div className="window-body" style={{ overflow: "auto" }}>
                  {isLinkableBlogPost ? (
                    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "8px" }}>
                      <a href={permalink}>
                        <button>Permalink</button>
                      </a>
                    </div>
                  ) : null}
                  {isCollapsedResolved ? (
                    <div
                      style={{ display: "flex", justifyContent: "flex-end" }}
                    >
                      <button onClick={handlePrimaryAction}>OK</button>
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
