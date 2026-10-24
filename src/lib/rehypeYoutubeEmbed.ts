import type { Element, ElementContent, Root } from "hast";
import { visit } from "unist-util-visit";
import { youtubeVideoId } from "./embeds.ts";

/**
 * Keeps the embed inside its container (the window body) at any width while
 * preserving the player's 16:9 shape, and centres it when the body is wider
 * than the cap. The width/height attributes stay as a no-CSS fallback and
 * give the browser the intrinsic ratio before styles load.
 */
const RESPONSIVE_STYLE =
  "width: 100%; max-width: 560px; height: auto; aspect-ratio: 16 / 9;" +
  " display: block; margin: 0 auto;";

/** The fallback title for embeds whose link text is just the bare URL
 * (markdown autolinks) — a URL reads poorly as a player title. */
const FALLBACK_TITLE = "YouTube video";

function textContent(node: ElementContent): string {
  if (node.type === "text") return node.value;
  if (node.type === "element") return node.children.map(textContent).join("");
  return "";
}

/** Uses the link's own text as the accessible player title when it is
 * human-readable ([my talk](…)), falling back for bare autolinks (<…>). */
function linkTitle(node: Element, href: string): string {
  const text = textContent(node).trim();
  return text && text.toLowerCase() !== href.toLowerCase()
    ? text
    : FALLBACK_TITLE;
}

/** Rehype plugin: replace YouTube links with responsive 16:9 embeds. */
export function rehypeYoutubeEmbed() {
  return (tree: Root) => {
    visit(tree, "element", (node, index, parent) => {
      if (!parent || index === undefined || node.tagName !== "a") return;
      const href = node.properties?.href;
      if (typeof href !== "string") return;
      const id = youtubeVideoId(href);
      if (!id) return;
      parent.children[index] = {
        type: "element",
        tagName: "iframe",
        properties: {
          src: `https://www.youtube-nocookie.com/embed/${id}`,
          title: linkTitle(node, href),
          width: "560",
          height: "315",
          loading: "lazy",
          style: RESPONSIVE_STYLE,
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
