const mods = import.meta.glob('./implementations/*Page.tsx', { eager: true })
import type { Pages } from ".";
import menuPages from "../content/menu.json"

export const PageRegistry: Record<string, any> =
    Object.fromEntries(
        Object.values(mods).flatMap((mod: any) =>
            Object.entries(mod).filter(([key]) => key.endsWith('Page'))
        )
    )

export const staticPages: Pages = menuPages;

export const usePages = () => {
    return staticPages;
}

export const usePath = (path: string, pages: Pages) => {
    // Find page by path and return the component
    const page = pages.find((page) => page.path === path);
    return page?.content;
};