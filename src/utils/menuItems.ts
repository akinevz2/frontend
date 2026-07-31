/**
 * Utility to build and sort menu items from page metadata.
 */

export interface MenuItem {
  label: string;
  href: string;
  hidden?: boolean;
}

export function generateMenuItems(
  pages: Array<{ url?: string; label?: string; hidden?: boolean }>,
  additionalLinks: MenuItem[] = [],
): MenuItem[] {
  const pageItems: MenuItem[] = pages
    .map((page) => {
      if (!page.url) return null;

      const normalizedUrl = page.url === "/index" ? "/" : page.url;
      const fallbackLabel =
        normalizedUrl === "/"
          ? "home"
          : normalizedUrl
            .replace(/^\//, "")
            .replace(/\/$/, "")
            .replace(/-/g, " ");
      const label = page.label ?? fallbackLabel;

      return {
        label,
        href: normalizedUrl,
        ...(page.hidden ? { hidden: true } : {}),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return [...pageItems, ...additionalLinks];
}
