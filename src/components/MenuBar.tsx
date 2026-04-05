import { useEffect, useMemo } from "react";
import { generateMenuItems, type MenuItem } from "../utils/menuItems";
import pages from "../pages.json";

type Link = {
  label: string;
  href: string;
};

type Props = {
  links?: Link[];
  additionalLinks?: MenuItem[];
  onNavigate?: (href: string) => void;
};

const PAGE_LINKS = (pages as Array<{ path: string }>).map((page) => ({
  url: page.path,
  label: (page as { menuLabel?: string }).menuLabel,
}));

const isTypingTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable
  );
};

const isInternalPath = (href: string) => href.startsWith("/");

export default function MenuBar({ links, additionalLinks = [], onNavigate }: Props) {
  const menuItems = useMemo(() => {
    if (links) {
      return links.map((link) => ({ label: link.label, href: link.href }));
    }

    return generateMenuItems(PAGE_LINKS, additionalLinks);
  }, [links, additionalLinks]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) {
        return;
      }

      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      if (event.key.length !== 1) {
        return;
      }

      const key = event.key.toLowerCase();
      const item = menuItems.find(
        (menuItem) => menuItem.label.charAt(0).toLowerCase() === key,
      );

      if (!item) {
        return;
      }

      if (onNavigate && isInternalPath(item.href)) {
        event.preventDefault();
        onNavigate(item.href);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuItems, onNavigate]);

  return (
    <div className="menu-bar">
      <menu role="menubar">
        {menuItems.map((item) => (
          <li key={item.href} role="none">
            <a
              href={item.href}
              role="menuitem"
              data-key={item.label.charAt(0).toLowerCase()}
              onClick={(event) => {
                if (!onNavigate || !isInternalPath(item.href)) {
                  return;
                }

                if (
                  event.defaultPrevented ||
                  event.button !== 0 ||
                  event.metaKey ||
                  event.ctrlKey ||
                  event.shiftKey ||
                  event.altKey
                ) {
                  return;
                }

                event.preventDefault();
                onNavigate(item.href);
              }}
            >
              <span className="menu-underline">{item.label.charAt(0)}</span>
              {item.label.slice(1)}
            </a>
          </li>
        ))}
      </menu>
    </div>
  );
}