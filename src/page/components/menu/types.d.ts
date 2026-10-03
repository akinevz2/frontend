/**
 * Menu types and interfaces
 * Centralized menu-related type definitions
 */

export interface MenuItem {
  label: string;
  path: string;
  icon?: string;
  children?: MenuItem[];
}

export interface MenuSection {
  title: string;
  items: MenuItem[];
}

export interface MenuProps {
  sections: MenuSection[];
}

export interface MenuGroup {
  title: string;
  items: MenuItem[];
}

export interface NavigationItem {
  label: string;
  link: string;
  active?: boolean;
}

export interface MenuState {
  isOpen: boolean;
  activeItem: string | null;
}

export interface MenuActions {
  toggle: () => void;
  selectItem: (item: string) => void;
  close: () => void;
}

export type MenuOption = MenuItem | MenuSection | MenuGroup;
