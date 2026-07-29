import type React from "react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import Markdown, { type Options as ReactMarkdownOptions } from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { toast } from "react-toastify";
import { playLayeredAudio } from "../lib/audioOverlap";
import { useSectionContext, useWindow } from "./hooks";
import { OkButton } from "./OkButton";
import type { Content, HttpUrl, SectionProps } from "./types";

const BLOG_PATH = "/blog";
const BLOG_POSTS_BASE_PATH = "/blog/";
const EXPERIMENTAL_THEME = "experimental";
const EXPERIMENTAL_THEME_REDIRECT_URL = "https://akinevz.dev";

const isBlogPath = (pathname: string) =>
  pathname.replace(/\/+$/, "") === BLOG_PATH;

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

    if (
      typeof item.heading === "string" &&
      toPostSlug(item.heading) === targetPostSlug
    ) {
      return true;
    }

    return (
      !!item.content &&
      contentContainsPostSlug(item.content as Content, targetPostSlug)
    );
  });
};

/**
 * Checks whether any nested section within `content` would produce the given
 * `targetSectionId` (a raw UUID on non-blog pages). This is used to auto-expand
 * ancestor sections so that a deeply nested target section reached via a
 * `#uuid` hash permalink becomes visible on any page.
 */
const contentContainsSectionId = (
  content: Content,
  targetSectionId: string,
): boolean => {
  if (typeof content === "string") {
    return false;
  }

  return content.some((item): boolean => {
    if (typeof item === "string") {
      return false;
    }

    const candidateId = item.uuid || toPostSlug(item.heading || "");
    if (candidateId === targetSectionId) {
      return true;
    }

    return (
      !!item.content &&
      contentContainsSectionId(item.content as Content, targetSectionId)
    );
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

const experimentalMarkdownRehypePlugins = [
  rehypeRaw,
] as ReactMarkdownOptions["rehypePlugins"];

function resolvePrintoutUrl(printoutPath: string): string {
  const trimmed = printoutPath.trim();

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
  } catch {
    // Not an absolute URL, fall back to local asset resolution.
  }

  // Use absolute root-path style: ensure path starts with /blog/
  if (!trimmed.startsWith("/")) {
    return `${BLOG_POSTS_BASE_PATH}${trimmed}`;
  }

  // Already an absolute path (starts with /), use as-is or prepend blog base
  // For paths not starting with /blog/, prepend the blog prefix
  if (!trimmed.startsWith(BLOG_PATH)) {
    return `${BLOG_POSTS_BASE_PATH}${trimmed.slice(1)}`;
  }

  return trimmed;
}

const markdownComponents = {
  img: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    <img
      {...props}
      style={{
        maxWidth: "100%",
        height: "auto",
        maxHeight: "24rem",
        ...(props.style ?? {}),
      }}
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

  useEffect(() => {
    let cancelled = false;

    const loadPrintout = async () => {
      if (typeof printout !== "string") {
        if (!cancelled) {
          setMarkdownContent(
            toFencedCodeBlock(normalizePrintoutText(printout)),
          );
        }
        return;
      }

      let printoutUrl: string;
      try {
        printoutUrl = resolvePrintoutUrl(printout);
      } catch (urlError) {
        const message =
          urlError instanceof Error ? urlError.message : "Unknown error";
        if (!cancelled) {
          setMarkdownContent(
            [
              "## Printout unavailable",
              `Failed to resolve printout path (${message}).`,
              "Please let kine (akinevz) know.",
              toFencedCodeBlock(printout),
            ].join("\n\n"),
          );
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
          setMarkdownContent(toFencedCodeBlock(fileContent));
        }
      } catch (fetchError) {
        const message =
          fetchError instanceof Error ? fetchError.message : "Unknown error";
        if (!cancelled) {
          setMarkdownContent(
            [
              "## Printout unavailable",
              `Failed to fetch printout '${printout}' (${message}).`,
              "Please let kine (akinevz) know.",
              toFencedCodeBlock(printout),
            ].join("\n\n"),
          );
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
    </div>
  );
}

function renderPrintout(printout: string | string[]) {
  return <PrintoutContent printout={printout} />;
}

function renderContent(
  content: Content,
  depth: number,
  sectionTheme?: string,
  allowedTheme: string = EXPERIMENTAL_THEME,
) {
  const isExperimental = sectionTheme === allowedTheme;
  const rehypePlugins = isExperimental
    ? experimentalMarkdownRehypePlugins
    : markdownRehypePlugins;

  if (typeof content === "string")
    return (
      <ul>
        <li>
          <Markdown
            rehypePlugins={rehypePlugins}
            components={markdownComponents}
          >
            {content}
          </Markdown>
        </li>
      </ul>
    );

  const groupedContent: Array<
    | { type: "markdown"; key: number; text: string }
    | { type: "section"; key: number; section: SectionProps }
  > = [];
  let bufferedLines: string[] = [];
  let bufferStartIndex = 0;

  const flushBufferedLines = () => {
    if (bufferedLines.length === 0) {
      return;
    }

    groupedContent.push({
      type: "markdown",
      key: bufferStartIndex,
      text: bufferedLines.join("  \n"),
    });
    bufferedLines = [];
  };

  content.forEach((item, index) => {
    if (typeof item === "string") {
      if (bufferedLines.length === 0) {
        bufferStartIndex = index;
      }
      bufferedLines.push(item);
      return;
    }

    flushBufferedLines();
    groupedContent.push({ type: "section", key: index, section: item });
  });

  flushBufferedLines();

  return (
    <ul>
      {groupedContent.map((item) =>
        item.type === "markdown" ? (
          <li key={`markdown-${item.key}`}>
            <Markdown
              rehypePlugins={rehypePlugins}
              components={markdownComponents}
            >
              {item.text}
            </Markdown>
          </li>
        ) : (
          <Section
            key={`section-${item.key}`}
            {...item.section}
            depth={depth + 1}
          />
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

function isRootOffsetUrl(link: string): boolean {
  // Root-offset links keep navigation on this site (e.g. /blog/?post=slug).
  return link.startsWith("/") && link.indexOf("..") == -1;
}

const playSound = () => {
  playLayeredAudio("/crunchy_kick.ogg");
  window.dispatchEvent(new CustomEvent("crunchy-kick-played"));
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
    theme,
  } = props;
  const hasHeading = !!heading;
  const hasContent = !!content;
  const hasStringContent = typeof content === "string";
  const hasLink = typeof link === "string" && link.length > 0;
  const hasPrintout =
    printout !== undefined &&
    ((typeof printout === "string" && printout.length > 0) ||
      (Array.isArray(printout) && printout.length > 0));
  const hasChildren = children !== undefined && children !== null;
  const shouldShowCollapsedContent =
    hasHeading && hasStringContent && !hasPrintout && !hasChildren;
  const shouldShowCollapsedOkButton = !shouldShowCollapsedContent || hasLink;
  const isOnBlogPage =
    typeof window !== "undefined" && isBlogPath(window.location.pathname);
  const rawTargetPostSlug =
    typeof window !== "undefined" && isOnBlogPage
      ? new URLSearchParams(window.location.search).get("post") || ""
      : "";
  const targetPostSlug = rawTargetPostSlug ? toPostSlug(rawTargetPostSlug) : "";

  // On the blog page, sections are identified by their post slug (derived from
  // the heading). On every other page we use the raw UUID as the anchor so that
  // permalinks stay stable regardless of heading text.
  const sectionId = useMemo(() => {
    if (isOnBlogPage) {
      return `section-${uuid || toPostSlug(heading || "")}`;
    }
    return uuid || toPostSlug(heading || "");
  }, [heading, uuid, isOnBlogPage]);

  // Generate permalink that works on any page
  const postSlug = toPostSlug(isOnBlogPage && heading ? heading : uuid ?? "");
  const permalink = useMemo(() => {
    if (isOnBlogPage && typeof window !== "undefined") {
      return `${window.location.origin}${BLOG_PATH}/?post=${encodeURIComponent(postSlug)}`;
    } else if (hasHeading && typeof heading === "string") {
      // For non-blog pages, use current URL with hash anchor
      if (typeof window !== "undefined") {
        const baseUrl = `${window.location.origin}${window.location.pathname}`;
        return `${baseUrl}#${sectionId}`;
      }
    }
    return "";
  }, [postSlug, hasHeading, heading, sectionId, isOnBlogPage]);

  // Detect whether this section should auto-open from a permalink.
  // On the blog page we match the ?post=slug query parameter.
  // On any other page we match the #sectionId hash fragment.
  const targetHash =
    typeof window !== "undefined" ? window.location.hash.slice(1) : "";
  const hasMatchingHash =
    typeof window !== "undefined" &&
    hasHeading &&
    typeof heading === "string" &&
    targetHash === sectionId;
  const shouldOpenFromLink =
    typeof window !== "undefined" &&
    (isOnBlogPage
      ? targetPostSlug === postSlug
      : hasMatchingHash);
  // On the blog page, expand ancestors whose content contains the target slug.
  // On any other page, expand ancestors whose content contains the target
  // sectionId so that a deeply nested section reached via #sectionId is visible.
  const shouldRevealLinkedPost =
    isOnBlogPage &&
    !!targetPostSlug &&
    !!content &&
    contentContainsPostSlug(content as Content, targetPostSlug);
  const shouldRevealLinkedSection =
    !isOnBlogPage &&
    !!targetHash &&
    !!content &&
    contentContainsSectionId(content as Content, targetHash);
  const isForcedExpanded =
    shouldOpenFromLink ||
    shouldRevealLinkedPost ||
    shouldRevealLinkedSection ||
    hasPrintout;

  const [isCollapsed, setIsCollapsed] = useState(!isForcedExpanded);
  const isCollapsedResolved = isForcedExpanded ? false : isCollapsed;

  // Handle permalink click - copy to clipboard and show notification
  const handlePermalinkClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();

      if (typeof window === "undefined" || !permalink) return;

      // Copy URL to clipboard
      navigator.clipboard.writeText(permalink).then(() => {
        // Play sound and show toast notification with window styling
        playSound();
        toast.success("Link copied to clipboard!", {
          position: "bottom-center",
          autoClose: 2000,
          hideProgressBar: true,
          closeOnClick: false,
          pauseOnHover: false,
          draggable: false,
          style: {
            padding: "8px 16px",
            fontFamily: "'Pixelated MS Sans Serif', Arial",
            display: "flex",
          },
        });
      });
    },
    [permalink],
  );

  // Define sectionUUID before using it in the hook
  const sectionUUID = uuid || `fallback-${heading}-${depth}`;

  // Use the useWindow hook for window state management (heading and uuid are from props)
  const {
    isMaximized,
    setIsMaximized,
    position,
    isDragging,
    handleMaximize,
    handleMinimize,
    closePoppedOutWindow,
    handleMouseDown,
    windowRef,
    inlineWindowRef,
    isMinimized,
  } = useWindow(heading, sectionUUID);

  // Use the local context for other operations that aren't in the hook yet
  const { markAsExpanded } = useSectionContext();

  // isMinimized comes from the useWindow hook (checks minimizedSections context)

  const clearPostSlugFromUrl = () => {
    if (typeof window === "undefined") {
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

  // handleClose uses closePoppedOutWindow from the hook, with clearPostSlugFromUrl as callback
  const handleClose = () => {
    if (isMaximized) {
      closePoppedOutWindow(clearPostSlugFromUrl);
    }
    playSound();
  };

  const handleExpand = useCallback(() => {
    setIsCollapsed(false);
    if (heading && typeof heading === "string") {
      markAsExpanded(heading);
    }
  }, [heading, markAsExpanded, setIsCollapsed]);

  const handlePrimaryAction = () => {
    if (hasLink && (isValidHttpUrl(link) || isRootOffsetUrl(link))) {
      window.location.assign(link);
      return;
    }

    handleExpand();
  };

  const handleExperimentalContextMenu = (
    event: React.MouseEvent<HTMLDivElement>,
  ) => {
    if (theme !== EXPERIMENTAL_THEME) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    window.location.assign(EXPERIMENTAL_THEME_REDIRECT_URL);
  };

  // Scroll to element when opening from a permalink (works on any page).
  // On the blog page this is triggered by ?post=slug; on other pages by #sectionId.
  // We scroll to the closest ancestor .window container (if any) rather than the
  // target element itself, so the whole parent window is brought into view with
  // the linked section visible inside it.
  useEffect(() => {
    if (!shouldOpenFromLink || typeof window === "undefined") {
      return;
    }

    // Small delay to ensure DOM is fully rendered before scrolling.
    const timer = setTimeout(() => {
      const self = inlineWindowRef.current;
      if (!self) return;

      // Find the nearest ancestor .window (skip the element itself).
      const scrollTarget =
        self.parentElement?.closest(".window") ?? self;

      scrollTarget.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [shouldOpenFromLink, inlineWindowRef]);

  const windowContent = (
    <div
      ref={inlineWindowRef}
      id={hasHeading && typeof heading === "string" ? sectionId : undefined}
      className={`window ${className || ""}`}
      onContextMenu={handleExperimentalContextMenu}
    >
      {hasHeading ? (
        <div className="title-bar">
          <a href={hasLink ? link : undefined}>
            <div className="title-bar-text">{heading}</div>
          </a>
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
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "0.75rem",
              flexWrap: "wrap",
            }}
          >
            {shouldShowCollapsedContent && hasContent
              ? renderContent(content, depth, theme)
              : null}
            {shouldShowCollapsedOkButton ? (
              <OkButton
                data-section-uuid={sectionUUID}
                onClick={handlePrimaryAction}
              />
            ) : null}
          </div>
        ) : (
          <>
            {hasPrintout ? renderPrintout(printout) : null}
            {hasContent ? renderContent(content, depth, theme) : null}
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
                id={
                  hasHeading && typeof heading === "string"
                    ? sectionId
                    : undefined
                }
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
                    <div className="title-bar-text">
                      <a href={hasLink ? link : undefined}>{heading}</a>
                    </div>
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
                  {hasHeading && typeof heading === "string" ? (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        marginBottom: "8px",
                      }}
                    >
                      <button onClick={handlePermalinkClick}>Permalink</button>
                    </div>
                  ) : null}
                  {isCollapsedResolved ? (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "0.75rem",
                        flexWrap: "wrap",
                      }}
                    >
                      {shouldShowCollapsedContent && hasContent
                        ? renderContent(content, depth, theme)
                        : null}
                      {shouldShowCollapsedOkButton ? (
                        <OkButton
                          data-section-uuid={sectionUUID}
                          onClick={handlePrimaryAction}
                        />
                      ) : null}
                    </div>
                  ) : (
                    <>
                      {hasPrintout ? renderPrintout(printout) : null}
                      {hasContent ? renderContent(content, depth, theme) : null}
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
