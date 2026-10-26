import { isValidElement, type ReactElement } from "react";
import type { Banner, Embed, Item, Section, ThemeName } from "@/content";

export type WindowChild =
  | { kind: "text"; lines: string[] }
  | { kind: "window"; node: WindowNode }
  | { kind: "embed"; embed: Embed }
  | { kind: "banner"; banner: Banner["banner"] }
  | { kind: "element"; element: ReactElement };

export type WindowNode = {
  /** Dotted tree index ("0", "0.1.2"); doubles as the DOM id and URL hash. */
  id: string;
  depth: number;
  heading?: string | undefined;
  link?: string | undefined;
  externalLink: boolean;
  themes: ThemeName[];
  className?: string | undefined;
  embed?: string | undefined;
  status?: string | undefined;
  copyText?: string | undefined;
  children: WindowChild[];
};

function toThemes(theme: Section["theme"]): ThemeName[] {
  if (!theme) return [];
  return Array.isArray(theme) ? theme : [theme];
}

function toItems(content: Section["content"]): Item[] {
  if (content === undefined) return [];
  if (typeof content === "string") return [content];
  return Array.isArray(content) ? content : [content];
}

function isEmbed(item: Section | Embed): item is Embed {
  return "url" in item && !("heading" in item);
}

function buildNode(section: Section, id: string, depth: number): WindowNode {
  const children: WindowChild[] = [];
  let sectionCount = 0;
  for (const item of toItems(section.content)) {
    if (typeof item === "string") {
      const last = children[children.length - 1];
      if (last?.kind === "text") last.lines.push(item);
      else children.push({ kind: "text", lines: [item] });
    } else if (isValidElement(item)) {
      children.push({ kind: "element", element: item });
    } else if ("banner" in item) {
      children.push({ kind: "banner", banner: item.banner });
    } else if ("include" in item) {
      // Directives are resolved at content load (src/content/index.ts);
      // reaching the model means an unknown/broken include slipped
      // through — fail loudly instead of rendering an opaque object.
      throw new Error(`Unresolved include directive: ${String(item.include)}`);
    } else if (isEmbed(item)) {
      children.push({ kind: "embed", embed: item });
    } else {
      children.push({
        kind: "window",
        node: buildNode(item, `${id}.${sectionCount++}`, depth + 1),
      });
    }
  }
  return {
    id,
    depth,
    heading: section.heading,
    link: section.link,
    externalLink: Boolean(section.externalLink),
    themes: toThemes(section.theme),
    className: section.className,
    embed: section.embed,
    status: section.status,
    copyText: section.text,
    children,
  };
}

/** Normalises JSON content into window trees; roots are numbered 0, 1, ...
 * (unless the section declares its own anchor id). */
export function buildWindows(content: Section | Section[]): WindowNode[] {
  const roots = Array.isArray(content) ? content : [content];
  return roots.map((section, index) =>
    buildNode(section, section.anchor ?? String(index), 0),
  );
}

export function flatten(nodes: WindowNode[]): WindowNode[] {
  return nodes.flatMap((node) => [
    node,
    ...flatten(
      node.children.flatMap((c) => (c.kind === "window" ? [c.node] : [])),
    ),
  ]);
}

/** Every descendant window id beneath a node (the node itself excluded) —
 * used to reveal a whole subtree when arriving via a hash href. */
export function descendantIds(windows: WindowNode[], rootId: string): string[] {
  const root = windows.find((w) => w.id === rootId);
  const acc: string[] = [];
  const walk = (node: WindowNode) => {
    for (const child of node.children) {
      if (child.kind === "window") {
        acc.push(child.node.id);
        walk(child.node);
      }
    }
  };
  if (root) walk(root);
  return acc;
}

/** "0.1.2" -> ["0", "0.1", "0.1.2"] */
export function lineage(id: string): string[] {
  const parts = id.split(".");
  return parts.map((_, i) => parts.slice(0, i + 1).join("."));
}

export function hasTheme(node: WindowNode, theme: ThemeName): boolean {
  return node.themes.includes(theme);
}

/** Whether the section carries content of its OWN to frame in the
 * maximized view: any child (text lines, embeds, banners, custom
 * elements, sub-section rows) or an embed body. Derived straight from
 * the JSON-built tree — the same metadata the renderer sees — so there
 * is no second flag to keep in step. A LINK-section without it has
 * nothing to lift: the maximized view would be an empty shell around
 * its rail, and the OK press navigates instead (see OkButton's
 * middleware). */
export const hasContent = (node: WindowNode): boolean =>
  node.children.length > 0 || Boolean(node.embed);
