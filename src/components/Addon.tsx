import { CopyToClipboardButton } from "./CopyToClipboardButton.tsx";
import type { Heading, SectionProps } from "../windowing";
import { useRef, useState } from "react";
import { playLayeredAudio } from "../lib/audioOverlap";
import Markdown, { type Options as ReactMarkdownOptions } from "react-markdown";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";

export type AddonProps = SectionProps & {
  status?: string | undefined;
  text?: string | undefined;
  link?: string | undefined;
  content?: string | (string | AddonProps)[] | undefined;
};

export type AddonContent = string | (string | AddonProps)[];

const markdownSanitizeSchema: unknown = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames || []), "iframe"],
  attributes: {
    ...defaultSchema.attributes,
    a: [...(defaultSchema.attributes?.a || []), ["target"], ["rel"]],
    img: [...(defaultSchema.attributes?.img || []), ["loading"], ["decoding"]],
    iframe: [
      ["title"],
      ["src"],
      ["width"],
      ["height"],
      ["style"],
      ["scrolling"],
      ["loading"],
      ["allow"],
      ["allowfullscreen"],
      ["referrerpolicy"],
      ["frameborder"],
    ],
  },
};

const markdownRehypePlugins = [
  [rehypeSanitize, markdownSanitizeSchema],
] as ReactMarkdownOptions["rehypePlugins"];

const markdownComponents = {
  img: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    <img
      {...props}
      style={{ maxWidth: "100%", height: "auto", ...(props.style ?? {}) }}
    />
  ),
};

function renderHeading(heading: Heading, link?: string) {
  return <RenderLink link={link} text={heading} />;
}

function renderContent(content: AddonContent, status?: string, text?: string) {
  if (typeof content === "string")
    return (
      <ul>
        <li key={0}>
          <Markdown
            rehypePlugins={markdownRehypePlugins}
            components={markdownComponents}
          >
            {content}
          </Markdown>
        </li>
        {renderAddon(status, text)}
      </ul>
    );
  return (
    <ul>
      {content.map((text, index) =>
        typeof text == "string" ? (
          <li key={index}>
            <Markdown
              rehypePlugins={markdownRehypePlugins}
              components={markdownComponents}
            >
              {text}
            </Markdown>
          </li>
        ) : (
          <Addon key={index} {...text} />
        ),
      )}
    </ul>
  );
}

function renderStatus(status: string) {
  return (
    <li className="addon">
      status: <em>{status}</em>
    </li>
  );
}

function RenderLink(props: { link: string | undefined; text: string }) {
  const { link, text } = props;
  if (link) {
    return (
      <a href={link} target="_blank">
        {text}
      </a>
    );
  }
  return <>{text}</>;
}

function renderAddon(status?: string, text?: string) {
  const elements = [];
  if (status) {
    elements.push(<span key="status">{renderStatus(status)}</span>);
  }
  if (text) {
    elements.push(
      <span key="text">
        <CopyToClipboardButton content={text} />
      </span>,
    );
  }
  return elements;
}

const playSound = (clickCount: number) => {
  const probability = 1 / Math.log(clickCount + Math.E);
  if (Math.random() < probability) {
    playLayeredAudio("/crunchy_kick.ogg");
    window.dispatchEvent(new CustomEvent("crunchy-kick-played"));
  }
};

type WindowPanelProps = AddonProps & {
  asList?: boolean;
};

const WindowPanel = ({
  heading,
  content,
  link,
  status,
  text,
  className,
  children,
}: WindowPanelProps) => {
  const hasHeading = !!heading;
  const hasContent = !!content;
  const [isMaximized, setIsMaximized] = useState(false);
  const closeClickCountRef = useRef(0);

  const handleMaximize = () => {
    setIsMaximized(!isMaximized);
  };

  const handleClose = () => {
    if (isMaximized) {
      setIsMaximized(false);
    } else {
      closeClickCountRef.current += 1;
      playSound(closeClickCountRef.current);
    }
  };

  const windowContent = (
    <div className={`window ${className || ""}`}>
      {hasHeading ? (
        <div className="title-bar">
          <div className="title-bar-text">{renderHeading(heading, link)}</div>
          <div className="title-bar-controls">
            <button aria-label="Minimize"></button>
            <button aria-label="Maximize" onClick={handleMaximize}></button>
            <button aria-label="Close" onClick={handleClose}></button>
          </div>
        </div>
      ) : null}
      <div className="window-body">
        {hasContent ? renderContent(content, status, text) : null}
        {children}
      </div>
    </div>
  );

  return (
    <>
      <div
        className="addon-wrapper"
        style={{ visibility: isMaximized ? "hidden" : "visible" }}
      >
        {windowContent}
      </div>
      {isMaximized && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 9999,
            maxWidth: "90vw",
            maxHeight: "90vh",
            overflow: "auto",
          }}
        >
          {windowContent}
        </div>
      )}
    </>
  );
};

export const AddonList = (props: AddonProps) => (
  <WindowPanel {...props} asList={true} />
);

export const Addon = (props: AddonProps) => <WindowPanel {...props} />;
