import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { Link } from "react-router-dom";

const schema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), "iframe"],
  attributes: {
    ...defaultSchema.attributes,
    img: [...(defaultSchema.attributes?.img ?? []), "style", "loading"],
    iframe: [
      "src",
      "width",
      "height",
      "title",
      "allow",
      "allowFullScreen",
      "loading",
      "style",
    ],
  },
};

type Props = { children: string; inline?: boolean };

export function Md({ children }: Props) {
  return (
    <Markdown
      rehypePlugins={[rehypeRaw, [rehypeSanitize, schema]]}
      components={{
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        a({ href, children: label, node: _node, ...rest }) {
          if (href?.startsWith("/") && !href.startsWith("//")) {
            return <Link to={href}>{label}</Link>;
          }
          const external = href?.startsWith("http");
          return (
            <a
              href={href}
              {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
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
