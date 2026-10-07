import z from 'zod';
export { useFetchDocument } from "./hooks"
export type * as default from "./types.d.ts";
/**
 * Type guard to check if an item is a valid SectionProps object.
 * This filters out ReactNodes and other non-SectionProps items that may be
 * present in content arrays.
 */
import type { PageContent, ClassName, SectionContent, TextContent, Content } from "./types.d.ts";
import { isValidElement } from 'react';
export function isSectionContent<T = {}>(item: unknown): item is SectionContent<T> {
    return (
        typeof item === "object" &&
        item !== null &&
        !Array.isArray(item) &&
        ("heading" in item || "content" in item || "printout" in item)
    );
}

export function isPageContent(item: unknown): item is PageContent {
    return (isSectionContent(item) && "metadata" in item);
}

export function isTextContent<T>(c: Content<T>): c is TextContent<T> {
    return (
        c !== null &&
        typeof c === 'object' &&
        !isValidElement(c) &&
        !Array.isArray(c)
    )
}


const DEV = import.meta.env.DEV
const OWN_ORIGIN = DEV
    ? 'http://localhost:8086'
    : 'https://akinevz.com'

// own origin only — document fetches, content json, markdown
export const OwnOriginUrl = z.url()
    .transform(u => new URL(u))
    .superRefine((u, ctx) => {
        if (u.origin && u.origin !== OWN_ORIGIN) {
            ctx.addIssue(`expected own origin ${OWN_ORIGIN}, got ${new URL(u).origin}`)
        }
    })

// https anywhere — external links, soundcloud, github etc
export const ExternalUrl = z.url()
    .superRefine((u, ctx) => {
        if (DEV) return  // allow anything in dev
        if (new URL(u).protocol !== 'https:') {
            ctx.addIssue(`external URLs must be https`)
        }
    })
    .transform(u => new URL(u))


export const flattenClassNames = (classNames: ClassName[]): ClassName => {
    return (Array.isArray(classNames)) ? classNames.join(" ") : classNames
}

export function resolveOwn(path: string | unknown): URL {
    if (!path || typeof (path) !== "string") throw new Error(`resolveOwn path is not string?: ${path}`);
    const absolute = path.startsWith('http://') || path.startsWith('https://') ? path : new URL(path, OWN_ORIGIN).toString()
    return OwnOriginUrl.parse(absolute)
}

export function assertLink(link: string, linktext?: string): void {
    if (link.indexOf("../") !== -1) throw new Error(`Link contains path escalation`);
    if (link.startsWith("/")) return;
    try {
        const parsed = resolveOwn(link);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
            throw new Error(`Link must use http/https or absolute local path${linktext ? ` for '${linktext}'` : ""}: '${link}'.`,);
    } catch {
        throw new Error(`Invalid link URL${linktext ? ` for '${linktext}'` : ""}: '${link}'.`);
    }
}

export function validateLinks(item: PageContent): void {
    if (!item) return;
    if (typeof (item) !== "object") return;
    if (!("external" in item)) return;
    if (typeof item.external.link === "string")
        assertLink(item.external.link);
    if (!Array.isArray(item.content)) return;
    for (const subItem of item.content)
        if (isPageContent(subItem)) validateLinks(subItem);
}

