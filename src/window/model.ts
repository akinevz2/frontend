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
  printout?: string | undefined;
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
    printout: section.printout,
    status: section.status,
    copyText: section.text,
    children,
  };
}

/** Normalises JSON content into window trees; roots are numbered 0, 1, ... */
export function buildWindows(content: Section | Section[]): WindowNode[] {
  const roots = Array.isArray(content) ? content : [content];
  return roots.map((section, index) => buildNode(section, String(index), 0));
}

export function flatten(nodes: WindowNode[]): WindowNode[] {
  return nodes.flatMap((node) => [
    node,
    ...flatten(
      node.children.flatMap((c) => (c.kind === "window" ? [c.node] : [])),
    ),
  ]);
}

/** "0.1.2" -> ["0", "0.1", "0.1.2"] */
export function lineage(id: string): string[] {
  const parts = id.split(".");
  return parts.map((_, i) => parts.slice(0, i + 1).join("."));
}

export function hasTheme(node: WindowNode, theme: ThemeName): boolean {
  return node.themes.includes(theme);
}
