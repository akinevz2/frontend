import { useEffect, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getCookie } from "@/lib/cookies";
import { visibleMenuItems } from "./menu";

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
    target.isContentEditable);

export function MenuBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const items = useMemo(
    () => visibleMenuItems(pathname, getCookie("admin") === "akinevz"),
    [pathname],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        isTyping(event.target) ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      )
        return;
      if (event.key.length !== 1) return;
      const key = event.key.toLowerCase();
      const item = items.find((i) => i.label[0]?.toLowerCase() === key);
      if (!item) return;
      event.preventDefault();
      navigate(item.href);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [items, navigate]);

  return (
    <nav className="menu-bar">
      <menu role="menubar">
        {items.map(({ label, href }) => (
          <li role="none" key={href}>
            <Link
              to={href}
              role="menuitem"
              data-key={label[0]?.toLowerCase()}
              data-clippy-drop-target={href === "/" ? "true" : undefined}
            >
              <span className="menu-underline">{label[0]}</span>
              {label.slice(1)}
            </Link>
          </li>
        ))}
      </menu>
    </nav>
  );
}
