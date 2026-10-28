import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { Link } from "react-router-dom";
import { rehypeYoutubeEmbed } from "@/lib/rehypeYoutubeEmbed";
import { sanitizeSchema } from "@/lib/sanitizeSchema";
import { CLIPPY_LINK, onClippyTriggerClick } from "./clippy";

type Props = { children: string; inline?: boolean };

export function Md({ children }: Readonly<Props>) {
  return (
    <Markdown
      // remarkBreaks: a single newline prints as a line break, not a
      // soft-break space — line-oriented writing (transcripts, rants,
      // verse) keeps its authored line shape instead of flowing into
      // one paragraph; a blank line still opens a new paragraph.
      // remarkGfm: CommonMark pipes tables (| Recipe | Effect |) so
      // content files need no raw <table> HTML; strikethrough and
      // task lists come along (unused today).
      remarkPlugins={[remarkBreaks, remarkGfm]}
      rehypePlugins={[
        rehypeRaw,
        rehypeYoutubeEmbed,
        [rehypeSanitize, sanitizeSchema],
      ]}
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
    </Markdown>
  );
}
