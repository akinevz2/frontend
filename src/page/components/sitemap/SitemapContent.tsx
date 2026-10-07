import type { Pages } from "@/page"

type SitemapContent = {
    pages: Pages
}
export function SitemapContent({ pages }: SitemapContent) {
    return `there's ${pages.length} pages on the website`;
}