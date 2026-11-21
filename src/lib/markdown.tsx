import Markdown, { type Components, type Options } from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { Link } from "react-router-dom";
import { rehypeYoutubeEmbed } from "@/lib/rehypeYoutubeEmbed";
import { rehypeHighlightSubset } from "@/lib/rehypeHighlightSubset";
import { sanitizeSchema } from "@/lib/sanitizeSchema";
import { CLIPPY_LINK, onClippyTriggerClick } from "./clippy";

type Props = { children: string; inline?: boolean };

/** The pipeline every Markdown render shares (the app's Md below, and the
 * build-time SEO snapshot in src/renderer/snapshot): one plugin list so
 * the two callers cannot drift apart. Exported for the snapshot only —
 * no behaviour change. */
export const markdownPlugins: Pick<Options, "remarkPlugins" | "rehypePlugins"> =
  {
    remarkPlugins: [remarkBreaks, remarkGfm],
    rehypePlugins: [
      rehypeRaw,
      rehypeYoutubeEmbed,
      rehypeHighlightSubset,
      [rehypeSanitize, sanitizeSchema],
    ],
  };

/** The shared Markdown renderer with caller-supplied components. `Md`
 * passes its interactive link component; the snapshot passes a
 * static, router-free one (see src/renderer/snapshot/snapshot.tsx). */
export function MdBase({
  children,
  components,
}: Readonly<Props> & {
  components?: Components;
}) {
  return (
    <Markdown {...markdownPlugins} components={components}>
      {children}
    </Markdown>
  );
}

export function Md({ children }: Readonly<Props>) {
  return (
    <MdBase
      // remarkBreaks: a single newline prints as a line break, not a
      // soft-break space — line-oriented writing (transcripts, rants,
      // verse) keeps its authored line shape instead of flowing into
      // one paragraph; a blank line still opens a new paragraph.
      // remarkGfm: CommonMark pipes tables (| Recipe | Effect |) so
      // content files need no raw <table> HTML; strikethrough and
      // task lists come along (unused today).
      // rehypeHighlightSubset: fenced blocks (```ts) get highlight.js
      // token spans (subset of grammars — see the plugin); the classes
      // survive rehypeSanitize via sanitizeSchema. Must run BEFORE
      // rehypeSanitize so the tokens it emits aren't stripped.
      // The plugin lists live in markdownPlugins above.
      components={{
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        a({ href, children: label, node: _node, ...rest }) {
          if (href === CLIPPY_LINK) {
            return (
              <a
                href={CLIPPY_LINK}
                onClick={(event) => {
                  event.preventDefault();
                  onClippyTriggerClick();
                }}
              >
                {label}
              </a>
            );
          }
          if (href?.startsWith("/") && !href.startsWith("//")) {
            return <Link to={href}>{label}</Link>;
          }
          const external = href?.startsWith("http");
          return (
            <a
              href={href}
              {...(external ? { rel: "noreferrer" } : {})}
              {...rest}
            >
              {label}
            </a>
          );
        },
      }}
    >
      {children}
    </MdBase>
  );
}
