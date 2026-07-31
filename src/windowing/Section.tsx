import {} from "react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import Markdown, { type Options as ReactMarkdownOptions } from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { toast } from "react-toastify";
import { playLayeredAudio } from "../lib/audioOverlap";
import { CopyToClipboardButton } from "../components/CopyToClipboardButton";
import { useSectionContext, useWindow } from "./hooks";
import { OkButton } from "./OkButton";
import type { Content, HttpUrl, SectionProps } from "./types";
import { ShowPermalinkButton } from "./ShowPermalinkButton";
import { isForceExpandedTheme, normalizeThemes } from "./themeEngine";

const BLOG_PATH = "/blog";
const BLOG_POSTS_BASE_PATH = "/blog/";
// sessionStorage key prefix for the blog "return-to page scroll offset"
// feature. The full key is `${BLOG_SCROLL_OFFSET_KEY}:${postSlug}`.
const BLOG_SCROLL_OFFSET_KEY = "blog-scroll-offset";

const isBlogPath = (pathname: string) =>
  pathname.replace(/\/+$/, "") === BLOG_PATH;

const toPostSlug = (heading: string) =>
  heading
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

// /**
//  * Type guard to check if an item is a valid SectionProps object.
//  * This filters out ReactNodes and other non-SectionProps items that may be
//  * present in content arrays.
//  */
// const isSectionPropsObject = (item: unknown): item is SectionProps => {
//   return (
//     typeof item === "object" &&
//     item !== null &&
//     !Array.isArray(item) &&
//     ("heading" in item || "content" in item)
//   );
// };

const contentContainsPostSlug = (
  content: Content,
  targetPostSlug: string,
): boolean => {
  if (!content) return false;
  if (!Array.isArray(content)) return false;

  return content.some((item: unknown): boolean => {
    if (typeof item === "string") {
      return false;
    }

    if (typeof item !== "object" || item === null) {
      return false;
    }

    const sectionItem = item as SectionProps;

    if (
      typeof sectionItem.heading === "string" &&
      toPostSlug(sectionItem.heading) === targetPostSlug
    ) {
      return true;
    }

    if (sectionItem.content) {
      return contentContainsPostSlug(
        sectionItem.content as Content,
        targetPostSlug,
      );
    }

    // ReactNode items don't have nested sections to check
    return false;
  });
};

/**
 * Checks whether any nested section within `content` would produce the given
 * `targetSectionId` (a stable tree-index on non-blog pages). This is used to
 * auto-expand ancestor sections so that a deeply nested target section reached
 * via a `#treeIndex` hash permalink becomes visible on any page.
 */
const contentContainsSectionId = (
  content: Content,
  targetSectionId: string,
): boolean => {
  if (!content || typeof content === "string") {
    return false;
  }

  const contentArray = Array.isArray(content) ? content : [];

  return contentArray.some((item: unknown): boolean => {
    if (typeof item !== "object" || item === null) {
      return false;
    }

    const sectionItem = item as SectionProps;
    const candidateId =
      sectionItem.treeIndex || toPostSlug(sectionItem.heading || "");
    if (candidateId === targetSectionId) {
      return true;
    }

    if (sectionItem.content) {
      return contentContainsSectionId(
        sectionItem.content as Content,
        targetSectionId,
      );
    }

    return false;
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

const FENCE = "````";
function toFencedCodeBlock(content: string): string {
  const trimmed = content.replace(/^\n+|\n+$/g, "");
  // Use a 4-backtick fence so triple-backtick sequences inside the content
  // don't break the outer code block on multi-line input.
  return `${FENCE}\n${trimmed}\n${FENCE}`;
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
              `Failed to resolve printout path(${message}).`,
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
          throw new Error(`HTTP ${response.status} `);
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
              `Failed to fetch printout '${printout}'(${message}).`,
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

function renderContent(content: Content, depth: number) {
  if (!content || typeof content === "string") {
    if (typeof content !== "string") return null;

    const rehypePlugins = markdownRehypePlugins;
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
  }

  const rehypePlugins = markdownRehypePlugins;

  const groupedContent: Array<
    | { type: "markdown"; key: number; text: string }
    | { type: "section"; key: number; section: SectionProps }
    | { type: "reactNode"; key: number; element: React.ReactNode }
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

  // Helper to check if item is a SectionProps object (not a string or React element).
  // A section may carry only a `heading` + `link` (no `content`), so we recognise
  // any object that has `heading`, `content`, or `link`. This mirrors the
  // isSectionPropsObject guard in utils.ts so the two stay consistent.
  const isSectionPropsObject = (item: unknown): item is SectionProps => {
    return (
      typeof item === "object" &&
      item !== null &&
      !Array.isArray(item) &&
      ("heading" in item ||
        "content" in item ||
        "link" in item ||
        "printout" in item)
    );
  };

  (content as Array<string | SectionProps>).forEach((item, index) => {
    if (typeof item === "string") {
      if (bufferedLines.length === 0) {
        bufferStartIndex = index;
      }
      bufferedLines.push(item);
      return;
    }

    flushBufferedLines();

    // Check if it's a SectionProps object - if so, render as nested section
    if (isSectionPropsObject(item)) {
      groupedContent.push({ type: "section", key: index, section: item });
    } else {
      // Otherwise treat as ReactNode and render directly without wrapper
      groupedContent.push({ type: "reactNode", key: index, element: item });
    }
  });

  flushBufferedLines();

  return (
    <ul>
      {groupedContent.map((item) => {
        if (item.type === "markdown") {
          return (
            <li key={`markdown - ${item.key} `}>
              <Markdown
                rehypePlugins={rehypePlugins}
                components={markdownComponents}
              >
                {item.text}
              </Markdown>
            </li>
          );
        }

        if (item.type === "section") {
          return (
            <Section
              key={`section - ${item.key}`}
              {...item.section}
              depth={depth + 1}
            />
          );
        }

        // ReactNode items render directly without wrapper
        return item.element;
      })}
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

// --- Shared sub-components --------------------------------------------------

type WindowControlsProps = {
  showMaximize: boolean;
  showMinimize: boolean;
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
};

const WindowControls = ({
  showMinimize,
  showMaximize,
  onMinimize,
  onMaximize,
  onClose,
}: WindowControlsProps) => (
  <div className="title-bar-controls">
    {showMinimize ? (
      <button aria-label="Minimize" onClick={onMinimize}></button>
    ) : null}
    {showMaximize ? (
      <button aria-label="Maximize" onClick={onMaximize}></button>
    ) : null}
    <button aria-label="Close" onClick={onClose}></button>
  </div>
);

type TitleBarProps = {
  isIconified: boolean;
  heading: string;
  link?: string | undefined;
  opensInNewTab?: boolean | undefined;
  showMaximize: boolean;
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
};

const TitleBar = ({
  isIconified,
  heading,
  link,
  opensInNewTab,
  showMaximize,
  onMinimize,
  onMaximize,
  onClose,
}: TitleBarProps) => (
  <div className="title-bar">
    <div className="title-bar-text">
      {link ? (
        <a
          href={link}
          target={opensInNewTab ? "_blank" : undefined}
          rel={opensInNewTab ? "noopener noreferrer" : undefined}
        >
          {heading}
        </a>
      ) : (
        heading
      )}
    </div>
    <WindowControls
      showMaximize={isIconified ? isIconified : showMaximize}
      showMinimize={!isIconified}
      onMinimize={onMinimize}
      onMaximize={isIconified ? onMinimize : onMaximize}
      onClose={onClose}
    />
  </div>
);

type SectionBodyProps = {
  isCollapsed: boolean;
  hasHeading: boolean;
  hasContent: boolean;
  hasPrintout: boolean;
  shouldShowCollapsedContent: boolean;
  shouldShowCollapsedOkButton: boolean;
  showPermalink: boolean;
  content?: Content | undefined;
  printout?: string | string[] | undefined;
  children?: React.ReactNode;
  depth: number;
  sectionUUID: string;
  onPrimaryAction: () => void;
  onPermalinkClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  // --- Addon extension ---
  isAddon?: boolean;
  status?: string | undefined;
  text?: string | undefined;
  hasStatus?: boolean;
  hasText?: boolean;
};

const SectionBody = ({
  isCollapsed,
  hasHeading,
  hasContent,
  hasPrintout,
  shouldShowCollapsedContent,
  shouldShowCollapsedOkButton,
  showPermalink,
  content,
  printout,
  depth,
  sectionUUID,
  onPrimaryAction,
  onPermalinkClick,
  isAddon = false,
  status,
  text,
  hasStatus = false,
  hasText = false,
}: SectionBodyProps) => (
  <>
    {isCollapsed ? (
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {shouldShowCollapsedContent && hasContent && content
          ? renderContent(content, depth)
          : null}
        {shouldShowCollapsedOkButton ? (
          <OkButton data-section-uuid={sectionUUID} onClick={onPrimaryAction} />
        ) : null}
      </div>
    ) : (
      <>
        {hasContent && content ? renderContent(content, depth) : null}
        {hasPrintout && printout ? renderPrintout(printout) : null}
        {isAddon ? (
          <AddonExtras
            status={status}
            text={text}
            hasStatus={hasStatus}
            hasText={hasText}
          />
        ) : null}
      </>
    )}
    <ShowPermalinkButton
      hasHeading={hasHeading}
      onPermalinkClick={onPermalinkClick}
      showPermalink={showPermalink}
    />
  </>
);

/** Renders the addon-specific extras: a status line and a copy-to-clipboard. */
function AddonExtras({
  status,
  text,
  hasStatus,
  hasText,
}: {
  status?: string | undefined;
  text?: string | undefined;
  hasStatus: boolean;
  hasText: boolean;
}) {
  if (!hasStatus && !hasText) {
    return null;
  }
  return (
    <ul>
      {hasStatus && status ? (
        <li className="addon">
          status: <em>{status}</em>
        </li>
      ) : null}
      {hasText && text ? (
        <li className="addon">
          <CopyToClipboardButton content={text} />
        </li>
      ) : null}
    </ul>
  );
}

export const Section = (props: SectionProps) => {
  const {
    heading,
    content,
    link,
    printout,
    className,
    depth = 0,
    uuid,
    treeIndex,
    theme,
    status,
    text,
    externalLink,
  } = props;
  const hasHeading = !!heading;
  const hasContent = !!content;
  const hasStringContent = typeof content === "string";
  const hasLink = typeof link === "string" && link.length > 0;
  const hasPrintout =
    printout !== undefined &&
    ((typeof printout === "string" && printout.length > 0) ||
      (Array.isArray(printout) && printout.length > 0));
  // A section is a section if it has at least one of: heading, content,
  // printout. A link alone is not enough — if it has a link it must also have
  // a heading (so the link has something to attach to via the TitleBar).
  const isSection = hasHeading || hasContent || hasPrintout;
  const hasValidLink = hasLink && hasHeading;
  // Addon extension fields: status line + clipboard copy button in the body.
  const hasStatus = typeof status === "string" && status.length > 0;
  const hasText = typeof text === "string" && text.length > 0;
  const shouldShowCollapsedContent =
    hasHeading && hasStringContent && !hasPrintout;
  const shouldShowCollapsedOkButton =
    !shouldShowCollapsedContent || hasValidLink;
  const isOnBlogPage =
    typeof window !== "undefined" && isBlogPath(window.location.pathname);
  const rawTargetPostSlug =
    typeof window !== "undefined" && isOnBlogPage
      ? new URLSearchParams(window.location.search).get("post") || ""
      : "";
  const targetPostSlug = rawTargetPostSlug ? toPostSlug(rawTargetPostSlug) : "";

  // On the blog page, sections are identified by their post slug (derived from
  // the heading). On every other page we use the stable tree-index (e.g.
  // "0", "0.1", "0.1.2") as the anchor so that permalinks remain valid across
  // page reloads regardless of randomly generated UUIDs.
  const sectionId = useMemo(() => {
    if (isOnBlogPage) {
      return `section-${treeIndex || toPostSlug(heading || "")}`;
    }
    return treeIndex || toPostSlug(heading || "");
  }, [heading, treeIndex, isOnBlogPage]);

  // Generate permalink that works on any page.
  // On the blog page, only nested sections (depth > 0) with headings are
  // treated as linkable blog posts — the top-level container is not.
  const isLinkableBlogPost =
    isOnBlogPage && depth > 0 && typeof heading === "string";
  const postSlug = isLinkableBlogPost ? toPostSlug(heading) : "";
  const permalink = useMemo(() => {
    if (isLinkableBlogPost && typeof window !== "undefined") {
      return `${window.location.origin}${BLOG_PATH}/?post=${encodeURIComponent(postSlug)}`;
    } else if (hasHeading && typeof heading === "string") {
      // For non-blog pages, use current URL with hash anchor
      if (typeof window !== "undefined") {
        const baseUrl = `${window.location.origin}${window.location.pathname}`;
        return `${baseUrl}#${sectionId}`;
      }
    }
    return "";
  }, [isLinkableBlogPost, postSlug, hasHeading, heading, sectionId]);

  // Detect whether this section should auto-open from a permalink.
  // On the blog page we match the ?post=slug query parameter (nested posts only).
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
    (isLinkableBlogPost ? targetPostSlug === postSlug : hasMatchingHash);
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

  // Normalize theme to array and create data-theme attribute value for CSS
  const normalizedThemes = normalizeThemes(theme);
  const dataThemeValue = normalizedThemes.join(" ");

  const isForcedExpanded =
    shouldOpenFromLink ||
    shouldRevealLinkedPost ||
    shouldRevealLinkedSection ||
    hasPrintout ||
    isForceExpandedTheme(
      normalizedThemes.length > 0 ? normalizedThemes[0] : undefined,
    );

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
    handleMaximize,
    handleClose,
    closePoppedOutWindow,
    windowRef,
    inlineWindowRef,
    isMinimized,
  } = useWindow(heading, sectionUUID);

  // Use the local context for other operations that aren't in the hook yet
  const { markAsExpanded, restoreSection, isAddonPage } = useSectionContext();

  // Whether this section renders as an addon is determined by the page it is
  // defined on (the addons page opts in via SectionProvider's isAddonPage),
  // not by the presence of addon-specific fields.
  const isAddon = isAddonPage;
  // Addons open their links in a new tab (external resources); a section may
  // also opt in explicitly via `externalLink`. Explicit opt-out still wins.
  const opensInNewTabResolved = isAddon || externalLink === true;

  // isMinimized comes from the useWindow hook (checks minimizedSections context)
  // When true the entire window is hidden (closed via the X button) and can be
  // restored from the "unhide" menu. The minimize button uses a separate local
  // iconified state so it only hides the window-body while keeping the title.
  const [isIconified, setIsIconified] = useState(false);

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

    // Restore the page scroll offset saved when the post was opened so the
    // user returns to where they were before the permalink scrolled them down.
    if (postSlug) {
      const key = `${BLOG_SCROLL_OFFSET_KEY}:${postSlug}`;
      try {
        const saved = sessionStorage.getItem(key);
        if (saved !== null) {
          window.scrollTo(0, Number(saved));
          sessionStorage.removeItem(key);
        }
      } catch {
        // sessionStorage unavailable; skip restoration.
      }
    }
  };

  // Wrap the hook's handleClose to also clear the blog post URL slug.
  const handleCloseWithUrl = () => {
    if (isMaximized) {
      closePoppedOutWindow(clearPostSlugFromUrl);
    } else {
      handleClose();
    }
    playSound();
  };

  // Minimizing toggles iconify: hides/shows the window-body, keeps the title.
  // Also unmaximizes if the window is currently maximized.
  const handleMinimizeToggle = () => {
    if (isMaximized) {
      setIsMaximized(false);
    }
    setIsIconified((prev) => !prev);
    playSound();
  };

  // Maximizing expands all content, unminimizes, and toggles the maximized
  // state. If already maximized, it just unmaximizes.
  const handleMaximizeToggle = () => {
    if (!isMaximized) {
      // Unminimize if hidden via the close button.
      if (isMinimized && sectionUUID) {
        restoreSection(sectionUUID);
      }
      // Unminify if iconified.
      setIsIconified(false);
      // Expand collapsed content.
      setIsCollapsed(false);
    }
    handleMaximize();
  };

  const handleExpand = useCallback(() => {
    setIsCollapsed(false);
    if (heading && typeof heading === "string") {
      markAsExpanded(heading);
    }
  }, [heading, markAsExpanded, setIsCollapsed]);

  const handlePrimaryAction = () => {
    if (hasValidLink && (isValidHttpUrl(link) || isRootOffsetUrl(link))) {
      // Addon-style external links open in a new tab and skip in-app
      // navigation/history stamping.
      if (opensInNewTabResolved) {
        window.open(link, "_blank", "noopener,noreferrer");
        return;
      }
      // Stamp the current URL with this section's hash before navigating so
      // that pressing "back" returns to the right scroll position.
      // On the blog page we use ?post=slug for navigation, so don't add a hash.
      if (typeof window !== "undefined" && sectionId && !isOnBlogPage) {
        const { pathname, search, hash } = window.location;
        if (hash !== `#${sectionId}`) {
          window.history.replaceState(
            {},
            "",
            `${pathname}${search}#${sectionId}`,
          );
        }
      }
      window.location.assign(link);
      return;
    }

    handleExpand();
  };

  // useEffect(
  //   () => {
  //     if (theme)
  //       console.log("theme thing not working yet, ", theme)
  //   }, [theme])

  // Scroll to element when opening from a permalink (works on any page).
  // On the blog page this is triggered by ?post=slug; on other pages by #sectionId.
  // Scroll to the closest enclosing .window container so the window's title bar
  // is in view.
  //
  // On the blog page we also save the page scroll offset before scrolling so
  // that closing the post (clearing ?post=slug) can restore the user's prior
  // position — the "return-to page scroll offset" behaviour.
  useEffect(() => {
    if (!shouldOpenFromLink || typeof window === "undefined") {
      return;
    }

    // Save the current scroll position once, before we scroll to the target,
    // so closing the post can restore it. Only stamp on the blog page where
    // navigation is driven by ?post=slug (a full re-render, not a hash jump).
    if (isOnBlogPage && targetPostSlug) {
      const key = `${BLOG_SCROLL_OFFSET_KEY}:${targetPostSlug}`;
      try {
        sessionStorage.setItem(key, String(window.scrollY));
      } catch {
        // sessionStorage may be unavailable (private mode / disabled); ignore.
      }
    }

    // Small delay to ensure DOM is fully rendered before scrolling.
    const timer = setTimeout(() => {
      const self = inlineWindowRef.current;
      if (!self) return;

      // Scroll to the section's own .window element so its title bar is in view.
      self.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [shouldOpenFromLink, inlineWindowRef, isOnBlogPage, targetPostSlug]);

  const windowContent = !isSection ? (
    content
  ) : (
    <div
      ref={inlineWindowRef}
      data-theme={dataThemeValue || undefined}
      id={hasHeading && typeof heading === "string" ? sectionId : undefined}
      className={`window ${className || ""}`.trim()}
    >
      {hasHeading && typeof heading === "string" ? (
        <TitleBar
          isIconified={isIconified}
          heading={heading}
          link={hasValidLink ? link : undefined}
          opensInNewTab={opensInNewTabResolved}
          showMaximize={depth !== 0}
          onMinimize={handleMinimizeToggle}
          onMaximize={handleMaximizeToggle}
          onClose={handleCloseWithUrl}
        />
      ) : null}
      {!isIconified ? (
        <div className="window-body">
          <SectionBody
            isCollapsed={isCollapsedResolved}
            hasHeading={hasHeading}
            hasContent={hasContent}
            hasPrintout={hasPrintout}
            shouldShowCollapsedContent={shouldShowCollapsedContent}
            shouldShowCollapsedOkButton={shouldShowCollapsedOkButton}
            showPermalink={false}
            content={content}
            printout={printout}
            depth={depth}
            sectionUUID={sectionUUID}
            onPrimaryAction={handlePrimaryAction}
            onPermalinkClick={handlePermalinkClick}
            isAddon={isAddon}
            status={status}
            text={text}
            hasStatus={hasStatus}
            hasText={hasText}
          />
        </div>
      ) : null}
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
            ref={windowRef}
            style={{
              zIndex: 9000,
              // Fill the available area below the menu bar, centred.
              width: "min(768px, 100vw)",
              maxWidth: "calc(100vw - 32px)",
              maxHeight: "calc(100vh - var(--menu-bar-height, 24px) - 32px)",
            }}
          >
            <div
              style={{
                position: "fixed",
                top: "var(--menu-bar-height, 24px)",
                left: 0,
                right: 0,
                bottom: 0,
                background: "rgba(0, 0, 0, 0.3)",
                zIndex: 8999,
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
                id={
                  hasHeading && typeof heading === "string"
                    ? sectionId
                    : undefined
                }
                className={`maximized window ${className || ""}`.trim()}
                style={{
                  cursor: "default",
                  maxWidth: "100%",
                  maxHeight: "100%",
                  boxSizing: "border-box",
                  // Scroll internally if content overflows instead of
                  // expanding beyond the screen.
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {hasHeading && typeof heading === "string" ? (
                  <TitleBar
                    isIconified={isIconified}
                    heading={heading}
                    link={hasValidLink ? link : undefined}
                    opensInNewTab={opensInNewTabResolved}
                    showMaximize={true}
                    onMinimize={handleMinimizeToggle}
                    onMaximize={handleMaximizeToggle}
                    onClose={handleCloseWithUrl}
                  />
                ) : null}
                {!isIconified ? (
                  <SectionBody
                    isCollapsed={isCollapsedResolved}
                    hasHeading={hasHeading}
                    hasContent={hasContent}
                    hasPrintout={hasPrintout}
                    shouldShowCollapsedContent={shouldShowCollapsedContent}
                    shouldShowCollapsedOkButton={shouldShowCollapsedOkButton}
                    showPermalink={hasHeading && typeof heading === "string"}
                    content={content}
                    printout={printout}
                    depth={depth}
                    sectionUUID={sectionUUID}
                    onPrimaryAction={handlePrimaryAction}
                    onPermalinkClick={handlePermalinkClick}
                    isAddon={isAddon}
                    status={status}
                    text={text}
                    hasStatus={hasStatus}
                    hasText={hasText}
                  />
                ) : null}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};
