import { isValidElement } from "react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import Markdown, { type Options as ReactMarkdownOptions } from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { toast } from "react-toastify";
import { playLayeredAudio } from "../lib/audioOverlap";
import { onClippyTriggerClick } from "../lib/keyboardInputUtils";
import { CopyToClipboardButton } from "../components/CopyToClipboardButton";
import { useSectionContext, useWindow } from "./hooks";
import { OkButton } from "./OkButton";
import type { Content, HttpUrl, MusicTrack, SectionProps } from "./types";
import type { MusicSource } from "./types";
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

// --- MusicTrack support ----------------------------------------------------
// `MusicTrack` and `MusicSource` types are defined in `./types` (so they can
// participate in the `Content` union without a circular import). The
// renderer-side helpers below turn a `MusicTrack` into an embedded iframe.

const detectMusicSource = (urlValue: string): MusicSource | null => {
  try {
    const parsed = new URL(urlValue);
    if (parsed.hostname === "open.spotify.com") return "spotify";
    if (
      parsed.hostname === "soundcloud.com" ||
      parsed.hostname.endsWith(".soundcloud.com")
    ) {
      return "soundcloud";
    }
  } catch {
    // fall through to null
  }
  return null;
};

const isMusicTrackObject = (item: unknown): item is MusicTrack => {
  if (typeof item !== "object" || item === null || Array.isArray(item)) {
    return false;
  }
  // Distinguish from SectionProps by ensuring none of its discriminator
  // fields are present.
  if (
    "heading" in item ||
    "content" in item ||
    "link" in item ||
    "printout" in item
  ) {
    return false;
  }
  const candidate = item as Partial<MusicTrack>;
  const validSource =
    candidate.source === undefined ||
    candidate.source === "soundcloud" ||
    candidate.source === "spotify";
  return (
    validSource &&
    typeof candidate.title === "string" &&
    typeof candidate.url === "string" &&
    (typeof candidate.path === "string" || typeof candidate.owner === "string")
  );
};

const SOUNDCLOUD_EMBED_HOST = "https://w.soundcloud.com/player/";

const buildSoundCloudEmbedUrl = (trackUrl: string): string => {
  const embedUrl = new URL(SOUNDCLOUD_EMBED_HOST);
  embedUrl.searchParams.set("url", trackUrl);
  embedUrl.searchParams.set("color", "ff5500");
  embedUrl.searchParams.set("auto_play", "false");
  embedUrl.searchParams.set("hide_related", "false");
  embedUrl.searchParams.set("show_comments", "true");
  embedUrl.searchParams.set("show_user", "true");
  embedUrl.searchParams.set("show_reposts", "false");
  embedUrl.searchParams.set("visual", "true");
  return embedUrl.toString();
};

const SPOTIFY_RESOURCE_TYPES = new Set([
  "track",
  "playlist",
  "album",
  "artist",
  "episode",
  "show",
]);

const buildSpotifyEmbedUrl = (
  trackUrl: string,
): { embedUrl: string; resourceType: string } | null => {
  try {
    const parsed = new URL(trackUrl);
    if (parsed.hostname !== "open.spotify.com") return null;
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments.length < 2) return null;
    const resourceType = segments[0];
    const resourceId = segments[1];
    if (!resourceType || !resourceId) return null;
    if (!SPOTIFY_RESOURCE_TYPES.has(resourceType)) return null;
    return {
      embedUrl: `https://open.spotify.com/embed/${resourceType}/${resourceId}`,
      resourceType,
    };
  } catch {
    return null;
  }
};

/**
 * Derive a `min-height` (in pixels) for a Spotify embed iframe purely from
 * the resource-type string embedded in the embed URL. There is no lookup
 * table — the height is computed dynamically from the length and vowel
 * density of the resource-type token so it scales with the resource at
 * runtime.
 */
const SPOTIFY_BASE_HEIGHT_PX = 152;

const spotifyEmbedMinHeight = (resourceType: string): number => {
  const lengthFactor = 1 + (resourceType.length - 4) * 0.18;
  const vowelCount = (resourceType.match(/[aeiou]/g) ?? []).length;
  const vowelFactor = 1 + vowelCount * 0.12;
  const raw = SPOTIFY_BASE_HEIGHT_PX * lengthFactor * vowelFactor;
  return Math.max(120, Math.min(420, Math.round(raw)));
};

type ResolvedMusicTrack = {
  source: MusicSource;
  title: string;
  url: string;
  embedUrl: string;
  label: string;
  spotifyResourceType?: string;
};

const resolveMusicTrack = (track: MusicTrack): ResolvedMusicTrack | null => {
  const source = track.source ?? detectMusicSource(track.url) ?? "soundcloud";
  if (source === "spotify") {
    const spotify = buildSpotifyEmbedUrl(track.url);
    if (!spotify) return null;
    return {
      source,
      title: track.title,
      url: track.url,
      embedUrl: spotify.embedUrl,
      label: "Spotify",
      spotifyResourceType: spotify.resourceType,
    };
  }
  return {
    source,
    title: track.title,
    url: track.url,
    embedUrl: buildSoundCloudEmbedUrl(track.url),
    label: "SoundCloud",
  };
};

/**
 * Renders a `MusicTrack` as its own windowed `Section` (with className
 * `music-track-window`). Supports both SoundCloud and Spotify embeds —
 * `source` on the track (or its URL host) selects the provider.
 *
 * This is what lets `MusicTrack` be embedded as a nested element inside any
 * other Section's `content` array.
 */
export const MusicTrackSection = ({ track }: { track: MusicTrack }) => {
  const resolved = resolveMusicTrack(track);
  // Fallback to a plain link window when we can't build an embed — keeps the
  // windowed UI consistent instead of dropping the track entirely.
  if (!resolved) {
    return (
      <Section
        className="music-track-window music-track-unresolved"
        heading={`Track: ${track.title}`}
        content={`[${track.title}](${track.url})`}
      />
    );
  }
  // Iframe height is dynamic: Spotify embeds scale to fill the iframe
  // (`height="100%"`) with a per-resource `min-height` floor derived from
  // the URL; SoundCloud embeds stay at 250px. The `min-height` floor is
  // computed purely from the resource-type token — no static table.
  const spotifyMinHeight =
    resolved.source === "spotify" && resolved.spotifyResourceType
      ? spotifyEmbedMinHeight(resolved.spotifyResourceType)
      : 152;
  const iframeStyle =
    resolved.source === "spotify"
      ? `border-radius:12px; min-height:${spotifyMinHeight}px`
      : "min-height:250px";
  const iframeHeightAttr = resolved.source === "spotify" ? "100%" : "250";
  const sectionProps: SectionProps = {
    className: `music-track-window music-track-${resolved.source}`,
    heading: `Track: ${track.title}`,
    content: [
      `<iframe
        title="${resolved.label} track: ${track.title}"
        width="100%"
        height="${iframeHeightAttr}"
        style="${iframeStyle}"
        scrolling="no"
        frameBorder="no"
        allow="autoplay"
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        src="${resolved.embedUrl}"
      ></iframe>`,
      `[${track.title} on ${resolved.label}](${track.url})`,
    ].join("\n\n"),
  };
  return <Section {...sectionProps} />;
};

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

// Sentinel href used by the "[fuckingclippy](#fuckingclippy)" trigger word on
// the links page. Rendered as a clickable span wired to the Clippy click-repeat
// summon sequence instead of a real anchor.
const CLIPPY_TRIGGER_HREF = "#fuckingclippy";

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
  a: ({
    node,
    children,
    href,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    node?: unknown;
  }) => {
    void node;
    if (href === CLIPPY_TRIGGER_HREF) {
      return (
        <span
          role="button"
          tabIndex={0}
          onClick={onClippyTriggerClick}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onClippyTriggerClick();
            }
          }}
          style={{
            cursor: "pointer",
            textDecoration: "underline",
            userSelect: "none",
          }}
        >
          {children}
        </span>
      );
    }
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  },
};

function normalizePrintoutText(printout: string | string[]): string {
  return Array.isArray(printout) ? printout.join("\n") : printout;
}

function PrintoutContent({ printout }: { printout: string | string[] }) {
  const [markdownContent, setMarkdownContent] = useState(() =>
    normalizePrintoutText(printout),
  );

  useEffect(() => {
    let cancelled = false;

    const loadPrintout = async () => {
      if (typeof printout !== "string") {
        if (!cancelled) {
          setMarkdownContent(normalizePrintoutText(printout));
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
          setMarkdownContent(fileContent);
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
    | { type: "section"; key: number; section: SectionProps }
    | { type: "musicTrack"; key: number; track: MusicTrack }
    | { type: "markdown"; key: number; text: string }
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

  (
    content as Array<string | React.ReactNode | SectionProps | MusicTrack>
  ).forEach((item, index) => {
    if (typeof item === "string") {
      if (bufferedLines.length === 0) {
        bufferStartIndex = index;
      }
      bufferedLines.push(item);
      return;
    }

    flushBufferedLines();

    // Recognise MusicTrack objects first so they don't get misidentified as
    // SectionProps. Anything else falls through to the ReactNode branch.
    if (isMusicTrackObject(item)) {
      groupedContent.push({ type: "musicTrack", key: index, track: item });
    } else if (isSectionPropsObject(item)) {
      groupedContent.push({ type: "section", key: index, section: item });
    } else {
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
        if (item.type === "musicTrack") {
          return (
            <MusicTrackSection key={`music - ${item.key}`} track={item.track} />
          );
        }
        // ReactNode items render directly without wrapper. Unknown plain
        // objects (e.g. raw {title, url} payloads that slipped past
        // producer-side normalisation) get JSON-stringified as a
        // last-resort fallback so we never throw "Objects are not valid
        // as a React child".
        if (
          typeof item.element === "object" &&
          item.element !== null &&
          !Array.isArray(item.element) &&
          !isValidElement(item.element)
        ) {
          return (
            <li key={`unknown - ${item.key}`}>
              <code>{JSON.stringify(item.element)}</code>
            </li>
          );
        }
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
  const event = new CustomEvent("crunchy-kick-played", { cancelable: true });
  window.dispatchEvent(event);
  // Clippy cancels the first crunchy-kick per bubble episode ("haha it said
  // no"); when it does, the triggering window should stay open.
  return !event.defaultPrevented;
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
    <ShowPermalinkButton
      hasHeading={hasHeading}
      onPermalinkClick={onPermalinkClick}
      showPermalink={showPermalink}
    />
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
    if (!playSound()) {
      // Clippy said no — leave the window open on this first close click.
      return;
    }
    if (isMaximized) {
      closePoppedOutWindow(clearPostSlugFromUrl);
    } else {
      handleClose();
    }
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
    // Update URL hash to reflect expanded section for permalink support
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
  }, [heading, markAsExpanded, setIsCollapsed, sectionId, isOnBlogPage]);

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

  const isPlain = "nowindow" in normalizedThemes;
  const decorations = [!isPlain ? "window" : "", className ?? ""];
  const windowContent = !isSection ? (
    content
  ) : (
    <div
      ref={inlineWindowRef}
      data-theme={dataThemeValue || undefined}
      id={hasHeading && typeof heading === "string" ? sectionId : undefined}
      className={decorations.join(" ").trim()}
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
              // Use a real height (not just maxHeight) so the maximized
              // window can stretch to fill and the inner scroll area gets a
              // bounded height to scroll within. dvh accounts for mobile URL
              // bars; vh is the fallback.
              height: "calc(100vh - var(--menu-bar-height, 24px) - 32px)",
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
                  height: "100%",
                  boxSizing: "border-box",
                  // Keep the window itself from scrolling; the inner
                  // window-body below handles overflow.
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
                  <div
                    className="window-body maximized-window-body"
                    style={{
                      // Fill remaining vertical space below the title bar
                      // and scroll internally when content overflows instead
                      // of expanding beyond the screen.
                      flex: 1,
                      minHeight: 0,
                      overflowY: "auto",
                      overflowX: "hidden",
                    }}
                  >
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
                  </div>
                ) : null}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};
