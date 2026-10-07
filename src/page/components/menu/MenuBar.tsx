/**
 * MenuBar - Windows 98-style menu bar component
 *
 * This component provides a classic Windows 98 navigation bar:
 * - Single row of menu items styled like Windows 98 
 * - Basic page navigation functionality
 * - Fixed positioning at top of page
 *
 * Usage Example:
 *   <MenuBar pages={pagesData} />
 */

import React, { useState, useEffect, useCallback } from "react";
import "@/styles/MenuBar.css";
import { useNavigate, type Path } from "react-router-dom";
import type { PageConfig } from "../../types.d";
import { usePageContext } from "@/page/PageContext";

export interface MenuBarProps {
  location: Path;
}

export function MenuBar({ location }: MenuBarProps) {
  const navigate = useNavigate();
  const { pages } = usePageContext();
  const [activePath, setActivePath] = useState(location.pathname);

  // Update active path when location changes
  useEffect(() => {
    setActivePath(location.pathname);
  }, [location.pathname]);

  const handleNavigation = useCallback((page: PageConfig) => {
    navigate(page.path);
  }, [navigate]);

  return <nav className="menu-bar">
    {pages.map((page, index) => {
      return (page.menuLabel) ? (
        <button
          key={index}
          className={`menu-item ${activePath === page.path ? 'active' : ''}`}
          onClick={() => handleNavigation(page)}
          title={page.title}
        >
          {page.menuLabel || page.title}
        </button>
      ) : null
    })}
  </nav>
};