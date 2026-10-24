import type { Root } from "hast";
import { visit } from "unist-util-visit";

/**
 * Extracts a video id from common YouTube URL forms:
 *   https://youtu.be/<id>
 *   https://www.youtube.com/watch?v=<id>
 *   https://www.youtube.com/embed/<id>
 *   https://www.youtube.com/shorts/<id>
 * Returns null for anything else.
 */
function videoIdFromUrl(href: string): string | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www|m|music)\./, "");
  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0];
    return id && /^[A-Za-z0-9_-]+$/.test(id) ? id : null;
  }
  if (host !== "youtube.com" && host !== "youtube-nocookie.com") return null;
  if (url.pathname === "/watch") {
    const id = url.searchParams.get("v");
    return id && /^[A-Za-z0-9_-]+$/.test(id) ? id : null;
  }
  const embed = url.pathname.match(
    /^\/(?:embed|shorts|live|v)\/([A-Za-z0-9_-]+)/,
  );
  return embed ? (embed[1] ?? null) : null;
}

/** Rehype plugin: replace YouTube links with responsive 16:9 embeds. */
export function rehypeYoutubeEmbed() {
  return (tree: Root) => {
    visit(tree, "element", (node, index, parent) => {
      if (!parent || index === undefined || node.tagName !== "a") return;
      const href = node.properties?.href;
      if (typeof href !== "string") return;
      const id = videoIdFromUrl(href);
      if (!id) return;
      parent.children[index] = {
        type: "element",
        tagName: "iframe",
        properties: {
          src: `https://www.youtube-nocookie.com/embed/${id}`,
          title: "YouTube video",
          width: "560",
          height: "315",
          loading: "lazy",
          // YouTube's player rejects embeds without a usable referrer
          // (error 153). The site sends Referrer-Policy: no-referrer, so
          // the iframe needs its own policy to send its origin.
          referrerPolicy: "strict-origin-when-cross-origin",
          allow:
            "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
          allowFullScreen: true,
        },
        children: [],
      };
    });
  };
}
