import { isValidElement, type ReactElement } from "react";
import type { Banner, Embed, Item, Section, ThemeName } from "@/content/schema";

type LessonKind = NonNullable<Section["kind"]>;

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
  /** Learning kind ("hint"/"advice"/"reference") — rendered as data-kind
   * on the window element (docs/LEARNING_PLAN.md §5). */
  kind?: LessonKind | undefined;
  embed?: string | undefined;
  status?: string | undefined;
  copyText?: string | undefined;
  children: WindowChild[];
  /** Column layout ("left:"/"right:" content sections): extra child
   * groups rendered BESIDE `children` in a CSS grid. A node-level field,
   * not a child kind — every member stays a plain WindowChild, so the
   * flatten/descendant walks (which seed store flags and landings) must
   * traverse `columns` too: a mounted window the store cannot see is
   * the failure mode this replaces. */
  columns?: WindowChild[][];
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
  // Column layout: content, left and right each form a grid group —
  // content is the centre column. One tree-index counter across all
  // three keeps the nested window ids unique and stable. A missing
  // group is dropped (no blank grid track); a section with neither
  // left nor right has no columns field at all (plain flow).
  let columns: WindowChild[][] | undefined;
  if (section.left !== undefined || section.right !== undefined) {
    const left: WindowChild[] = [];
    const right: WindowChild[] = [];
    for (const item of toItems(section.left)) {
      if (typeof item === "string") {
        const last = left[left.length - 1];
        if (last?.kind === "text") last.lines.push(item);
        else left.push({ kind: "text", lines: [item] });
      } else if (isValidElement(item)) {
        left.push({ kind: "element", element: item });
      } else if ("banner" in item) {
        left.push({ kind: "banner", banner: item.banner });
      } else if ("include" in item) {
        throw new Error(
          `Unresolved include directive: ${String(item.include)}`,
        );
      } else if (isEmbed(item)) {
        left.push({ kind: "embed", embed: item });
      } else {
        left.push({
          kind: "window",
          node: buildNode(item, `${id}.${sectionCount++}`, depth + 1),
        });
      }
    }
    for (const item of toItems(section.right)) {
      if (typeof item === "string") {
        const last = right[right.length - 1];
        if (last?.kind === "text") last.lines.push(item);
        else right.push({ kind: "text", lines: [item] });
      } else if (isValidElement(item)) {
        right.push({ kind: "element", element: item });
      } else if ("banner" in item) {
        right.push({ kind: "banner", banner: item.banner });
      } else if ("include" in item) {
        throw new Error(
          `Unresolved include directive: ${String(item.include)}`,
        );
      } else if (isEmbed(item)) {
        right.push({ kind: "embed", embed: item });
      } else {
        right.push({
          kind: "window",
          node: buildNode(item, `${id}.${sectionCount++}`, depth + 1),
        });
      }
    }
    columns = [children, left, right].filter((group) => group.length > 0);
  }
  return {
    id,
    depth,
    heading: section.heading,
    link: section.link,
    externalLink: Boolean(section.externalLink),
    themes: toThemes(section.theme),
    className: section.className,
    kind: section.kind,
    embed: section.embed,
    status: section.status,
    copyText: section.text,
    // A column section's content lives ONLY in the grid (as the centre
    // column) — keeping it in the normal flow too would render the
    // content twice: once standalone, then again mid-grid.
    children: columns ? [] : children,
    ...(columns ? { columns } : {}),
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

/** Every nested window child of a node, from BOTH the normal flow and
 * the column groups — the single source the flatten/descendant walks
 * use, so a mounted window can never be invisible to the store. */
export function childWindows(node: WindowNode): WindowNode[] {
  const windowsOf = (children: WindowChild[] | undefined): WindowNode[] =>
    (children ?? []).flatMap((c) => (c.kind === "window" ? [c.node] : []));
  return [
    ...windowsOf(node.children),
    ...(node.columns ?? []).flatMap(windowsOf),
  ];
}

export function flatten(nodes: WindowNode[]): WindowNode[] {
  return nodes.flatMap((node) => [node, ...flatten(childWindows(node))]);
}

/** Every descendant window id beneath a node (the node itself excluded) —
 * used to reveal a whole subtree when arriving via a hash href. */
export function descendantIds(windows: WindowNode[], rootId: string): string[] {
  const root = windows.find((w) => w.id === rootId);
  const acc: string[] = [];
  const walk = (node: WindowNode) => {
    for (const child of childWindows(node)) {
      acc.push(child.id);
      walk(child);
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
 * is no second flag to keep in step. A LINK-section WITH content of its
 * own navigates directly — the maximized view would only frame what the
 * reader already has inline — so only the content-free ones lift the
 * maximized view instead (see OkButton's middleware). */
export const hasContent = (node: WindowNode): boolean =>
  node.children.length > 0 ||
  Boolean(node.columns?.length) ||
  Boolean(node.embed);
