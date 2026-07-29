import { useState, useRef, useEffect, useCallback } from "react";
import { useContext } from "react";
import type React from "react";
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
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const windowRef = useRef<HTMLDivElement>(null);
  const inlineWindowRef = useRef<HTMLDivElement>(null);
  const { minimizedSections, minimizeSection, restoreSection } = useSectionContext();

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

  const closePoppedOutWindow = useCallback((clearUrl?: () => void) => {
    setIsMaximized(false);
    if (clearUrl) {
      clearUrl();
    }
    // Closing should not leave an entry in the minimized windows menu.
    if (sectionUUID) {
      restoreSection(sectionUUID);
    }
  }, [sectionUUID, restoreSection]);

  const handleMinimize = useCallback(() => {
    if (!heading || typeof heading !== "string") return;

    // Close maximized window before minimizing
    if (isMaximized) {
      minimizePoppedOutWindow();
      return;
    }

    if (sectionUUID) {
      minimizeSection(sectionUUID, heading);
    }
  }, [heading, isMaximized, sectionUUID, minimizeSection, minimizePoppedOutWindow]);

  // Drag handling
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

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".title-bar-controls")) {
      return; // Don't drag when clicking window controls
    }
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  }, [position]);

  return {
    isMaximized,
    setIsMaximized,
    position,
    dragOffset,
    isDragging,
    handleMaximize,
    handleMinimize,
    minimizePoppedOutWindow,
    closePoppedOutWindow,
    handleMouseDown,
    windowRef,
    inlineWindowRef,
    isMinimized,
  };
};
