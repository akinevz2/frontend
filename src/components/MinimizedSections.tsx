import React, { useState, useEffect, useRef } from 'react';
import { useSectionContext } from './SectionContext';

export const MinimizedSections: React.FC = () => {
  const { minimizedSections, restoreSection } = useSectionContext();
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
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (minimizedSections.size === 0) {
    return null;
  }

  return (
    <div className="minimized-menu" ref={menuRef}>
      <button 
        className="menu-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span className="menu-underline">u</span>nhide ({minimizedSections.size})
      </button>
      {isOpen && (
        <div className="dropdown-menu">
          {Array.from(minimizedSections.keys()).map((heading) => (
            <button
              key={heading}
              className="dropdown-item"
              onClick={() => {
                restoreSection(heading);
                setIsOpen(false);
              }}
            >
              {heading}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
