import { useState, useRef, useCallback } from "react";
import { useContext } from "react";
import { SectionContext } from "./context";

export const useSectionContext = () => {
  const context = useContext(SectionContext);
  if (!context) {
    throw new Error("useSectionContext must be used within a SectionProvider");
  }
  return context;
};

/**
 * Hook for managing window state and operations.
 * Abstracts the logic for popped-out windows to reduce code duplication in Section components.
 */
export const useWindow = (heading?: string, uuid?: string) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const windowRef = useRef<HTMLDivElement>(null);
  const inlineWindowRef = useRef<HTMLDivElement>(null);
  const { minimizedSections, minimizeSection, restoreSection } =
    useSectionContext();

  // UUID must be provided from server-side processing
  const sectionUUID = uuid || (heading ? `fallback-${heading}` : undefined);
  const isMinimized = sectionUUID ? minimizedSections.has(sectionUUID) : false;

  const handleMaximize = useCallback(() => {
    setIsMaximized((prev) => !prev);
  }, []);

  const minimizePoppedOutWindow = useCallback(() => {
    setIsMaximized(false);
    if (heading && typeof heading === "string" && sectionUUID) {
      minimizeSection(sectionUUID, heading);
    }
  }, [heading, sectionUUID, minimizeSection]);

  const closePoppedOutWindow = useCallback(
    (clearUrl?: () => void) => {
      setIsMaximized(false);
      if (clearUrl) {
        clearUrl();
      }
    },
    [],
  );

  // Minimizing toggles the iconified state: hides/shows the window-body while
  // keeping the title bar visible on the page.
  const handleMinimize = useCallback(() => {
    if (!heading || typeof heading !== "string" || !sectionUUID) return;

    if (isMaximized) {
      minimizePoppedOutWindow();
      return;
    }

    if (isMinimized) {
      restoreSection(sectionUUID);
    } else {
      minimizeSection(sectionUUID, heading);
    }
  }, [
    heading,
    isMaximized,
    isMinimized,
    sectionUUID,
    minimizeSection,
    restoreSection,
    minimizePoppedOutWindow,
  ]);

  // Closing hides the entire window (including title bar) and adds it to the
  // "unhide" menu so it can be brought back.
  const handleClose = useCallback(() => {
    if (isMaximized) {
      closePoppedOutWindow();
    }
    if (heading && typeof heading === "string" && sectionUUID) {
      minimizeSection(sectionUUID, heading);
    }
  }, [isMaximized, closePoppedOutWindow, heading, sectionUUID, minimizeSection]);

  return {
    isMaximized,
    setIsMaximized,
    handleMaximize,
    handleMinimize,
    handleClose,
    closePoppedOutWindow,
    windowRef,
    inlineWindowRef,
    isMinimized,
  };
};
