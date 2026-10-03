const mods = import.meta.glob('./implementations/*Page.tsx', { eager: true })
import definedPages from "./content/pages.json"
import type { Page } from "./types";

export const PageRegistry: Record<string, any> =
    Object.fromEntries(
        Object.values(mods).flatMap((mod: any) =>
            Object.entries(mod).filter(([key]) => key.endsWith('Page'))
        )
    )

export const pages: Page[] = definedPages;
export const usePages = () => {
    return pages;
}
