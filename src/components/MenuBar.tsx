import { type ReactNode } from "react";

export interface MenuBarProps {
  children?: ReactNode;
}

export function MenuBar({ children }: MenuBarProps) {
  return (
    <div className="menu-bar">
      <div className="menu-bar-content">
        <div className="menu-bar-left">File</div>
        <div className="menu-bar-right">{children}</div>
      </div>
    </div>
  );
}