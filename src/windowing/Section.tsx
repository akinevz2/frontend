import type React from "react";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Markdown from "react-markdown";
import { useSectionContext } from "./hooks";
import type { Content, SectionProps } from "./types";

function renderContent(content: Content, depth: number) {
  if (typeof content === "string")
    return (
      <ul>
        <li>
          <Markdown>{content}</Markdown>
        </li>
      </ul>
    );
  return (
    <ul>
      {content.map((text, index) =>
        typeof text == "string" ? (
          <li key={index}>
            <Markdown>{text}</Markdown>
          </li>
        ) : (
          <Section key={index} {...text} depth={depth + 1} />
        ),
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
  const { heading, content, className, children, depth = 0, uuid } = props;
  const hasHeading = !!heading;
  const hasContent = !!content;
  const [isMaximized, setIsMaximized] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);
  const { markAsExpanded, minimizeSection, minimizedSections } =
    useSectionContext();

  // UUID must be provided from server-side processing
  if (!uuid) {
    console.error("Section missing UUID:", { heading, depth });
  }
  const sectionUUID = uuid || `fallback-${heading}-${depth}`;
  const isMinimized = minimizedSections.has(sectionUUID);

  // Debug logging
  console.log("Section render:", {
    heading,
    hasContent,
    isCollapsed,
    isMinimized,
    isMaximized,
    uuid: sectionUUID,
    depth,
  });

  const handleMinimize = () => {
    if (heading && typeof heading === "string") {
      // Close maximized window before minimizing
      if (isMaximized) {
        setIsMaximized(false);
      }
      minimizeSection(sectionUUID, heading);
    }
  };

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

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".title-bar-controls")) {
      return; // Don't drag when clicking window controls
    }
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && isMaximized) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset, isMaximized]);

  // Center the window when first maximized
  useEffect(() => {
    if (
      isMaximized &&
      windowRef.current &&
      position.x === 0 &&
      position.y === 0
    ) {
      const rect = windowRef.current.getBoundingClientRect();
      setPosition({
        x: (window.innerWidth - rect.width) / 2,
        y: (window.innerHeight - rect.height) / 2,
      });
    }
  }, [isMaximized, position.x, position.y]);

  const windowContent = (
    <div className={`window ${className || ""}`}>
      {hasHeading ? (
        <div className="title-bar">
          <div className="title-bar-text">{heading}</div>
          <div className="title-bar-controls">
            <button aria-label="Minimize" onClick={handleMinimize}></button>
            {depth !== 0 && (
              <button aria-label="Maximize" onClick={handleMaximize}></button>
            )}
            <button aria-label="Close" onClick={handleClose}></button>
          </div>
        </div>
      ) : null}
      <div className="window-body">
        {isCollapsed ? (
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
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
      {!isMinimized && !isMaximized && windowContent}
      {!isMinimized &&
        isMaximized &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.3)",
              zIndex: 9998,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={(e) => {
              // Close when clicking backdrop
              if (e.target === e.currentTarget) {
                setIsMaximized(false);
              }
            }}
          >
            <div
              ref={windowRef}
              style={{
                position: "absolute",
                left: `${position.x}px`,
                top: `${position.y}px`,
                zIndex: 9999,
                maxWidth: "90vw",
                maxHeight: "90vh",
                overflow: "auto",
                cursor: isDragging ? "grabbing" : "default",
              }}
            >
              <div
                className={`window ${className || ""}`}
                style={{ cursor: "default" }}
              >
                {hasHeading ? (
                  <div
                    className="title-bar"
                    style={{ cursor: "grab" }}
                    onMouseDown={handleMouseDown}
                  >
                    <div className="title-bar-text">{heading}</div>
                    <div className="title-bar-controls">
                      <button
                        aria-label="Minimize"
                        onClick={handleMinimize}
                      ></button>
                      <button
                        aria-label="Maximize"
                        onClick={handleMaximize}
                      ></button>
                      <button aria-label="Close" onClick={handleClose}></button>
                    </div>
                  </div>
                ) : null}
                <div className="window-body">
                  {isCollapsed ? (
                    <div
                      style={{ display: "flex", justifyContent: "flex-end" }}
                    >
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
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};
