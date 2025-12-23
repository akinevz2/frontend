import type React from "react";
import { useState } from "react";
import { useSectionContext } from "./SectionContext";

export type Content = string | string[] | SectionProps[];
export type Heading = string;
export type SectionProps = {
  className?: string;
  heading?: Heading;
  content?: Content;
  children?: React.ReactNode[];
  depth?: number;
};

// function renderHeading(heading: Heading) {
//   if (typeof heading === "string") return <h1>{heading}</h1>;
//   return heading;
// }

function renderContent(content: Content, depth: number) {
  if (typeof content === "string")
    return (
      <ul>
        <li>{content}</li>
      </ul>
    );
  return (
    <ul>
      {content.map((text, index) =>
        typeof text == "string" ? (
          <li key={index}>{text}</li>
        ) : (
          <Section key={index} {...text} depth={depth + 1} />
        )
      )}
    </ul>
  );
}

const playSound = () => {
  console.log("Close button clicked!");
  const audio = new Audio("/crunchy_kick.ogg");
  audio.play().catch((err) => alert("Error playing sound: " + err));
};

export const Section = (props: SectionProps) => {
  const { heading, content, className, children, depth = 0 } = props;
  const hasHeading = !!heading;
  const hasContent = !!content;
  const [isMaximized, setIsMaximized] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const { markAsExpanded } = useSectionContext();

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

  const handleExpand = () => {
    setIsCollapsed(false);
    if (heading && typeof heading === "string") {
      markAsExpanded(heading);
    }
  };

  const windowContent = (
    <div className={`window ${className || ""}`}>
      {hasHeading ? (
        <div className="title-bar">
          <div className="title-bar-text">{heading}</div>
          <div className="title-bar-controls">
            <button aria-label="Minimize"></button>
            {depth !== 0 && (
              <button aria-label="Maximize" onClick={handleMaximize}></button>
            )}
            <button aria-label="Close" onClick={handleClose}></button>
          </div>
        </div>
      ) : null}
      <div className="window-body">
        {isCollapsed ? (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <button onClick={handleExpand}>OK</button>
          </div>
        ) : (
          <>
            {hasContent ? renderContent(content, depth) : null}
            {children}
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div style={{ visibility: isMaximized ? "hidden" : "visible" }}>
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
