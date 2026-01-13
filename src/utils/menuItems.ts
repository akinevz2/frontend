/**
 * Utility to discover and generate menu items from Astro pages
 */

export interface MenuItem {
  label: string;
  href: string;
  order?: number;
}

/**
 * Generate menu items from page files
 * @param pages - import.meta.glob result of page files
 * @param additionalLinks - Optional additional links (PDFs, external, etc.)
 * @returns Sorted array of menu items
 */
export function generateMenuItems(
  pages: Array<{ url?: string} >,
  additionalLinks: MenuItem[] = []
): MenuItem[] {
  // Default label mapping for pages
  const labelMap: Record<string, { label: string; order: number }> = {
    '/': { label: 'home', order: 1 },
    '/index': { label: 'home', order: 1 },
    '/addons': { label: 'addons', order: 2 },
    '/contact': { label: 'contact', order: 3 },
  };

  // Generate menu items from discovered pages
  const pageItems: MenuItem[] = pages
    .map((page) => {
      if (!page.url) return null;
      
      const mapping = labelMap[page.url];
      if (mapping) {
        // Normalize href for home page to always be '/'
        const href = mapping.label === 'home' ? '/' : page.url;
        return {
          label: mapping.label,
          href: href,
          order: mapping.order,
        };
      }
      
      // Auto-generate label from URL if not in map
      const label = page.url
        .replace(/^\//, '')
        .replace(/\/$/, '')
        .replace(/-/g, ' ') || 'home';
      
      return {
        label,
        href: page.url,
        order: 999, // Put unmapped pages at the end
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  // Combine with additional links
  const allItems = [...pageItems, ...additionalLinks];

  // Sort by order, then alphabetically
  return allItems.sort((a, b) => {
    const orderA = a.order ?? 999;
    const orderB = b.order ?? 999;
    if (orderA !== orderB) return orderA - orderB;
    return a.label.localeCompare(b.label);
  });
}
