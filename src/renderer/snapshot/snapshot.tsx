import { renderToStaticMarkup } from "react-dom/server";
import type {
  AnchorHTMLAttributes,
  ClassAttributes,
  HTMLAttributes,
  IframeHTMLAttributes,
} from "react";
import type { Components, ExtraProps } from "react-markdown";
import type { Banner, Embed, Section } from "@/content/schema";
import {
  buildWindows,
  type WindowChild,
  type WindowNode,
} from "@/window/model";
import { CLIPPY_LINK } from "@/lib/clippy";
import { MdBase } from "@/lib/markdown";

const external = (href: string) => /^https?:\/\//.test(href);

/** Links: real anchors for every client. Internal hrefs are already
 * root-relative paths from the content; external ones carry rel="noopener". */
function snapLinkProps(href: string) {
  return external(href) ? { href, rel: "noopener" } : { href };
}

/** The snapshot's markdown components: static anchors instead of the
 * app's router Links, and iframes (raw HTML embeds in content, or the
 * YouTube link rewrite from rehypeYoutubeEmbed) degraded to plain links
 * — title + url, never a frame. The clippy trigger keeps its href (the
 * interactive page shows the same text as a link; the click behaviour is
 * app-only and irrelevant without JS). */
const snapshotMarkdownComponents = {
  a({
    href,
    children,
  }: ClassAttributes<HTMLAnchorElement> &
    AnchorHTMLAttributes<HTMLAnchorElement> &
    ExtraProps) {
    if (href === undefined) return <a>{children}</a>;
    if (href === CLIPPY_LINK) return <a href={CLIPPY_LINK}>{children}</a>;
    return <a {...snapLinkProps(href)}>{children}</a>;
  },
  iframe({
    src,
    title,
  }: ClassAttributes<HTMLIFrameElement> &
    IframeHTMLAttributes<HTMLIFrameElement> &
    ExtraProps) {
    return src ? <a {...snapLinkProps(src)}>{title || src}</a> : null;
  },
  h1({
    children,
  }: ClassAttributes<HTMLHeadingElement> &
    HTMLAttributes<HTMLHeadingElement> &
    ExtraProps) {
    // Markdown-authored "# ..." headings inside content items demote to
    // <h2>: the page's single <h1> is the top window heading, never a
    // markdown line (same text, one level down — the interactive page
    // shows the same words).
    return <h2>{children}</h2>;
  },
} satisfies Components;

function SnapMd({ children }: { children: string }) {
  return <MdBase components={snapshotMarkdownComponents}>{children}</MdBase>;
}

/** Heading level: the first root window is the page's <h1>; the other
 * roots start at <h2>; every nested window steps down by depth, capped
 * at <h6>. */
function headingLevel(node: WindowNode, isFirstRoot: boolean): number {
  if (node.depth === 0) return isFirstRoot ? 1 : 2;
  return Math.min(node.depth + 1, 6);
}

function WindowHeading({ node, level }: { node: WindowNode; level: number }) {
  const label = node.heading ?? "";
  // A linked window's URL lives in its heading anchor (the interactive
  // title bar navigates the same way) — stub windows (heading + link,
  // no content) would otherwise leave the target unreachable by crawlers.
  const heading = node.link ? (
    <a {...snapLinkProps(node.link)}>{label}</a>
  ) : (
    label
  );
  // The window's tree id doubles as the anchor id: the same id the
  // interactive app's permalinks address (#tree-index / ?post=slug).
  const id = { id: node.id };
  switch (level) {
    case 1:
      return <h1 {...id}>{heading}</h1>;
    case 2:
      return <h2 {...id}>{heading}</h2>;
    case 3:
      return <h3 {...id}>{heading}</h3>;
    case 4:
      return <h4 {...id}>{heading}</h4>;
    case 5:
      return <h5 {...id}>{heading}</h5>;
    default:
      return <h6 {...id}>{heading}</h6>;
  }
}

function EmbedChild({ embed }: { embed: Embed }) {
  // Embeds are players in the interactive app (iframes); in the snapshot
  // they are their title as a link to the embed URL.
  return (
    <li>
      <p className="music-track-title">
        <a {...snapLinkProps(embed.url)}>{embed.title}</a>
      </p>
    </li>
  );
}

function BannerChild({ banner }: { banner: Banner["banner"] }) {
  // The interactive tile renders the image as a CSS background; the
  // snapshot renders a real <img> (alt = the banner's first line) plus
  // every caption line, inside the banner's link.
  const [first, ...rest] = banner.lines;
  return (
    <li>
      <a {...snapLinkProps(banner.href)}>
        <img src={banner.image} alt={first ?? ""} />
        {rest.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </a>
    </li>
  );
}

/** Mirrors the interactive Children switch (src/window/Window.tsx):
 * text lines render through markdown, nested windows recurse. */
function Child({ child }: { child: WindowChild }) {
  switch (child.kind) {
    case "text":
      return (
        <li>
          <SnapMd>{child.lines.join("  \n")}</SnapMd>
        </li>
      );
    case "embed":
      return <EmbedChild embed={child.embed} />;
    case "banner":
      return <BannerChild banner={child.banner} />;
    case "element":
      // ReactElement items come from bespoke page builders (today only
      // MusicPage's track-total <h3>) — plain, DOM-pure elements.
      return <li>{child.element}</li>;
    case "window":
      return (
        <li>
          <SnapshotWindow node={child.node} isFirstRoot={false} />
        </li>
      );
  }
  // noUncheckedIndexedAccess keeps the switch exhaustive; unreachable.
  return null;
}

function ChildList({ items }: { items: WindowChild[] }) {
  return (
    <ul>
      {items.map((child, index) => (
        <Child key={index} child={child} />
      ))}
    </ul>
  );
}

function SnapshotWindow({
  node,
  isFirstRoot,
}: {
  node: WindowNode;
  isFirstRoot: boolean;
}) {
  // Column layout sections keep their content ONLY in the column groups
  // (model.ts empties `children` for them) — the snapshot renders every
  // group, centre column first, exactly the data the app grids.
  return (
    <>
      {node.heading && (
        <WindowHeading node={node} level={headingLevel(node, isFirstRoot)} />
      )}
      {node.status && (
        <p className="addon-status">
          status: <em>{node.status}</em>
        </p>
      )}
      {node.children.length > 0 && <ChildList items={node.children} />}
      {(node.columns ?? []).map((group, column) => (
        <ChildList key={column} items={group} />
      ))}
      {node.embed && (
        // A Section.embed is a build-known public path the interactive
        // app fetches at runtime (ResourceEmbed); the snapshot links it.
        <p>
          <a {...snapLinkProps(node.embed)}>{node.embed}</a>
        </p>
      )}
    </>
  );
}

export const SNAPSHOT_CSS = `[data-seo-snapshot]{box-sizing:border-box;max-width:64rem;margin:0 auto;padding:1.5rem;font-family:system-ui,sans-serif;line-height:1.5;color:#1a1a1a}[data-seo-snapshot] img{max-width:100%;height:auto}[data-seo-snapshot] a{color:#0645ad}[data-seo-snapshot] pre{overflow-x:auto}`;

/** The static snapshot of one page's content tree. */
export function Snapshot({ content }: { content: Section | Section[] }) {
  const windows = buildWindows(content);
  return (
    <main data-seo-snapshot>
      {windows.map((node, index) => (
        <SnapshotWindow key={node.id} node={node} isFirstRoot={index === 0} />
      ))}
    </main>
  );
}

/** The html injected inside <div id="root">: a minimal readable default
 * style plus the snapshot. The app replaces the whole subtree on mount,
 * so the style is transient (the brief pre-boot plain-content paint). */
export function renderSnapshotHtml(content: Section | Section[]): string {
  return `<style>${SNAPSHOT_CSS}</style>${renderToStaticMarkup(
    <Snapshot content={content} />,
  )}`;
}
