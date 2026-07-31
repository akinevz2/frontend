import { useEffect, useMemo } from "react";
import { generateMenuItems, type MenuItem } from "../utils/menuItems";
import pages from "../../pages.json";

type Link = {
  label: string;
  href: string;
};

type Props = {
  links?: Link[];
  additionalLinks?: MenuItem[];
  onNavigate?: (href: string) => void;
  onMenuAction?: (href: string) => boolean;
  currentPath?: string;
};

const PAGE_LINKS = (
  pages as Array<{ path: string; menuLabel?: string; hidden?: boolean }>
).map((page) => ({
  url: page.path,
  ...(page.menuLabel ? { label: page.menuLabel } : {}),
  ...(page.hidden ? { hidden: true } : {}),
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

const SITEMAP_HREF = "/sitemap";
const HIDDEN_HREFS = ["/addons", "/resume", "/documents"];

const normalizePath = (path: string) => {
  if (!path || path === "/") {
    return "/";
  }

  return `/${path.replace(/^\/+|\/+$/g, "")}`;
};

const hasAdminCookie = () =>
  typeof document !== "undefined" &&
  document.cookie.split("; ").some((cookie) => cookie === "admin=akinevz");

const filterHiddenMenuItems = (menuItems: MenuItem[], currentPath?: string) => {
  const hide: (href: string) => boolean = (href) => {
    return HIDDEN_HREFS.includes(href);
  };
  const isAddonsPage = hide(normalizePath(currentPath ?? "/404"));
  const withoutAddons = isAddonsPage
    ? menuItems
    : menuItems.filter((item) => !hide(item.href));

  // Remove items marked hidden in pages.json (e.g. /404).
  const withoutHidden = withoutAddons.filter((item) => !item.hidden);

  if (hasAdminCookie()) {
    return withoutHidden;
  }

  return withoutHidden.filter((item) => item.href !== SITEMAP_HREF);
};

export default function MenuBar({
  links,
  additionalLinks = [],
  onNavigate,
  onMenuAction,
  currentPath,
}: Props) {
  const menuItems = useMemo(() => {
    if (links) {
      return filterHiddenMenuItems(
        links.map((link) => ({ label: link.label, href: link.href })),
        currentPath,
      );
    }

    return filterHiddenMenuItems(
      generateMenuItems(PAGE_LINKS, additionalLinks),
      currentPath,
    );
  }, [links, additionalLinks, currentPath]);

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

      if (onMenuAction?.(item.href)) {
        event.preventDefault();
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
  }, [menuItems, onMenuAction, onNavigate]);

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

                if (onMenuAction?.(item.href)) {
                  event.preventDefault();
                  return;
                }

                if (onNavigate && isInternalPath(item.href)) {
                  event.preventDefault();
                  onNavigate(item.href);
                }
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
