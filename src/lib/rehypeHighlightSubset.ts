import type { Element, ElementContent, Root } from "hast";
import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import python from "highlight.js/lib/languages/python";
import shellSession from "highlight.js/lib/languages/shell";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import { createLowlight } from "lowlight";
import { visit } from "unist-util-visit";

/**
 * rehype plugin: highlight fenced code blocks with a REGISTERED SUBSET of
 * highlight.js grammars.
 *
 * rehype-highlight always ships its ~37-grammar "common" set (it statically
 * references it, so bundlers cannot tree-shake it away), which pushed the
 * markdown chunk past 500 kB. This plugin does exactly what rehype-highlight
 * does for `language-*` code elements — `hljs` class + lowlight token spans —
 * but against a lowlight instance holding only the grammars below. Content
 * fences use console/sh/bash/python today; unregistered languages render as
 * plain code with the language- class, so a fence in a new language costs
 * nothing but its colors (register its grammar here to colorize).
 */
const lowlight = createLowlight({
  bash,
  console: shellSession, // "Shell Session" grammar; aliases console/shellsession
  css,
  javascript,
  json,
  python,
  typescript,
  xml,
});

// Content denotes session transcripts as ```shell; without this the fence
// resolves to nothing (hljs's bash aliases are sh/zsh only) and the block
// renders unstyled. Map it onto the same Shell Session grammar as console.
lowlight.registerAlias("console", "shell");

/** Concatenated plain text of a code element (pre-formatted whitespace). */
function textOf(node: Element): string {
  let text = "";
  for (const child of node.children) {
    if (child.type === "text") {
      text += child.value;
    } else if ("children" in child) {
      text += textOf(child as Element);
    }
  }
  return text;
}

export function rehypeHighlightSubset() {
  return (tree: Root) => {
    visit(tree, "element", (node, _index, parent) => {
      // Mirror rehype-highlight: only code blocks (code > pre), not inline code.
      if (
        node.tagName !== "code" ||
        !parent ||
        parent.type !== "element" ||
        parent.tagName !== "pre"
      ) {
        return;
      }
      const className = Array.isArray(node.properties.className)
        ? node.properties.className
        : [];
      // Strip a `{1,3-5}`-style meta suffix ("language-js{.lineNumbers}").
      const lang = className
        .find((name) => name.startsWith("language-"))
        ?.slice(9)
        .replace(/[^\w-].*$/, "");
      if (!lang || !lowlight.registered(lang)) {
        return;
      }
      if (!className.includes("hljs")) {
        className.unshift("hljs");
        node.properties.className = className;
      }
      let result;
      try {
        result = lowlight.highlight(lang, textOf(node));
      } catch {
        // Unknown/failed grammar: leave the block as plain code.
        return;
      }
      if (result.children.length > 0) {
        node.children = result.children as ElementContent[];
      }
    });
  };
}
