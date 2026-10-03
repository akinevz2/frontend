/**
 * MenuBar - Windows XP-style menu bar component using 98.css
 *
 * This component provides a classic Windows XP navigation bar using 98.css styling:
 * - Flex-based multi-line overflow handling
 * - Page-based navigation system
 * - Windows XP/aesthetic with proper padding and silver backgrounds
 *
 * Usage Example:
 *   <MenuBar pages={pagesData} />
 */

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import type { Page } from "../../types.d";

export interface MenuBarProps {
  /**
   * Array of pages to display in the navigation bar
   * Pages should contain path, title, and optional icon/menulabel properties
   */
  pages: Page[];
  
  /**
   * Optional custom CSS classes for the nav element
   */
  className?: string;
  
  /**
   * Optional custom CSS classes for the content container
   */
  containerClassName?: string;
  
  /**
   * Optional CSS class added to active menu items (by default: "active")
   */
  activeClassName?: string;
  
  /**
   * Maximum width for the menu bar content wrapper (responsive)
   */
  maxWidth?: number;
}

/**
 * MenuItem - Individual Windows XP-style page navigation item component
 */
const MenuItem: React.FC<{
  page: Page;
  isActive: boolean;
  onClick: () => void;
  activeClassName?: string;
}> = ({ page, isActive, onClick, activeClassName = "" }) => {
  return (
    <button
      onClick={onClick}
      className={`menu-item ${isActive ? activeClassName : ""}`}
    >
      {page.menuLabel && <span className="menu-icon">{page.menuLabel}</span>}
      <span className="menu-text">{page.title}</span>
    </button>
  );
};

/**
 * MenuOverflowWrapper - Flex container for multi-line overflow using 98.css
 */
const MenuOverflowWrapper: React.FC<{
  items: Page[];
  onItemClick: (page: Page) => void;
  activePath: string;
  itemClassName?: string;
  activeClassName?: string;
}> = ({
  items,
  onItemClick,
  activePath,
  itemClassName = "",
  activeClassName = "active"
}) => {
  return (
    <nav className={`menu-wrapper ${itemClassName}`}>
      {items.map((page, index) => {
        const isActive = page.path === activePath;

        return (
          <MenuItem
            key={index}
            page={page}
            isActive={isActive}
            onClick={() => onItemClick(page)}
            activeClassName={activeClassName}
          />
        );
      })}
    </nav>
  );
};

/**
 * MenuBar - Main Windows XP-style navigation bar component
 */
export const MenuBar: React.FC<MenuBarProps> = ({
  pages,
  className = "",
  containerClassName = "",
  activeClassName = "active",
  maxWidth = 900,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activePath, setActivePath] = useState(location.pathname);

  // Update active path when location changes
  useEffect(() => {
    setActivePath(location.pathname);
  }, [location.pathname]);

  const handleNavigation = useCallback((page: Page) => {
    navigate(page.path);
  }, [navigate]);

  return (
    <nav className={`menu-bar ${className}`}>
      <div className={`menu-bar-content ${containerClassName}`} style={{ maxWidth: `${maxWidth}vw` }}>
        <div className="menu-bar-left">
          <MenuOverflowWrapper
            items={pages.filter(p => p.title === "Home")}
            onItemClick={handleNavigation}
            activePath={activePath}
            activeClassName={activeClassName}
          />
        </div>
        
        <div className="menu-bar-right">
          <MenuOverflowWrapper
            items={pages.filter(p => p.title !== "Home")}
            onItemClick={handleNavigation}
            activePath={activePath}
            activeClassName={activeClassName}
          />
        </div>
      </div>
    </nav>
  );
};

// Export Page type for use in other components
export type { Page };
