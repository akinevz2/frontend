import { useState, useEffect, useRef } from "react";
import { useSectionContext } from "./hooks";

export const MinimizedSections: React.FC = () => {
  const { minimizedSections, restoreSection, pageMetadata } =
    useSectionContext();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  if (minimizedSections.size === 0) {
    return null;
  }

  // Check if any root-level sections (depth=0) are minimized
  const hasRootLevelMinimized = Array.from(minimizedSections.keys()).some(
    (uuid) => {
      const metadata = pageMetadata.sections.find((s) => s.uuid === uuid);
      return metadata?.depth === 0;
    },
  );

  const buttonText = hasRootLevelMinimized ? "unhide all" : "unhide";

  const handleButtonClick = () => {
    if (hasRootLevelMinimized) {
      // Restore all minimized sections
      Array.from(minimizedSections.keys()).forEach((uuid) => {
        restoreSection(uuid);
      });
      setIsOpen(false);
    } else {
      // Toggle dropdown
      setIsOpen(!isOpen);
    }
  };

  return (
    <div className="unhide-button-container" ref={menuRef}>
      <button
        className="menu-button minimized-menu-button"
        style={{
          backgroundColor:
            minimizedSections.size > 0
              ? "rgba(51, 153, 255, 0.3)"
              : "transparent",
        }}
        onClick={handleButtonClick}
        aria-expanded={isOpen}
      >
        <span className="menu-underline">u</span>
        {buttonText.slice(1)} ({minimizedSections.size})
      </button>
      {isOpen && (
        <div className="dropdown-menu">
          {Array.from(minimizedSections.entries()).map(([uuid, heading]) => {
            // Look up full metadata if available
            const metadata = pageMetadata.sections.find((s) => s.uuid === uuid);
            const displayHeading = metadata?.heading || heading;

            return (
              <button
                key={uuid}
                className="dropdown-item"
                onClick={() => {
                  restoreSection(uuid);
                  setIsOpen(false);
                }}
              >
                {displayHeading}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
