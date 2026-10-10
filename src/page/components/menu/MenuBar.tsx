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

import { useState, useEffect, useCallback } from "react";
import { useNavigate, type Path } from "react-router-dom";
import type { PageConfig } from "../../types.d";
import { usePageContext } from "../PageContext";

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
  }, [location]);

  const handleNavigation = useCallback(
    (page: PageConfig) => {
      navigate(page.path);
      setActivePath(page.path);
    },
    [navigate],
  );

  return (
    <nav className="menu-bar">
      {pages.map((page: PageConfig, index: number) => {
        return page.menuLabel ? (
          <button
            key={index}
            className={`menu-item ${activePath === page.path ? "active" : ""}`}
            onClick={() => handleNavigation(page)}
            title={page.title}
          >
            {page.menuLabel || page.title}
          </button>
        ) : null;
      })}
    </nav>
  );
}
