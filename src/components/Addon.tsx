import { CopyToClipboardButton } from "./CopyToClipboardButton.tsx";
import type { Heading, SectionProps } from "../windowing";
import { useState } from "react";

export type AddonProps = SectionProps & {
  status?: string | undefined;
  text?: string | undefined;
  link?: string | undefined;
  content?: string | (string | AddonProps)[] | undefined;
};

export type AddonContent = string | (string | AddonProps)[];

function renderHeading(heading: Heading, link?: string) {
  return <RenderLink link={link} text={heading} />;
}

function renderContent(content: AddonContent, status?: string, text?: string) {
  if (typeof content === "string")
    return (
      <ul>
        <li key={0}>{content}</li>
        {renderAddon(status, text)}
      </ul>
    );
  return (
    <ul>
      {content.map((text, index) =>
        typeof text == "string" ? (
          <li key={index}>{text}</li>
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

const playSound = () => {
  console.log("Close button clicked!");
  const audio = new Audio("/crunchy_kick.ogg");
  audio.play().catch(() => alert("Error playing sound: crunchy_kick.ogg"));
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

  const handleMaximize = () => {
    setIsMaximized(!isMaximized);
  };

  const handleClose = () => {
    if (isMaximized) {
      setIsMaximized(false);
    } else {
      playSound();
    }
  };

  const windowContent = (
    <div className={`window ${className || ""}`}>
      {hasHeading ? (
        <div className="title-bar">
          <div className="title-bar-text">
            {renderHeading(heading, link)}
          </div>
          <div className="title-bar-controls">
            <button aria-label="Minimize"></button>
            <button aria-label="Maximize" onClick={handleMaximize}></button>
            <button aria-label="Close" onClick={handleClose}></button>
          </div>
        </div>
      ) : null}
      <div className="window-body">
        {hasContent
          ? renderContent(content, status, text)
          : null}
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
