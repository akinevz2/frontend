import { routes, type Route } from "@/content";

export type MenuItem = { label: string; href: string };

export function visibleMenuItems(
  currentPath: string,
  isAdmin: boolean,
  all: Route[] = routes,
): MenuItem[] {
  return all
    .filter((route) => !route.hidden && route.menu !== false)
    .filter((route) => route.menu !== "onlyHere" || route.path === currentPath)
    .filter((route) => route.menu !== "admin" || isAdmin)
    .map((route) => ({
      label: route.menuLabel ?? route.path.slice(1),
      href: route.menuHref ?? route.path,
    }));
}
