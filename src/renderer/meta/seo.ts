/**
 * Shared head-meta helpers: the build (build/meta.ts) writes the static
 * head tags and JSON-LD, the shell (src/shell/useRouteMeta.ts) keeps
 * them in step on client navigation — one implementation for both so
 * the two cannot disagree.
 */

/** Descriptions longer than this truncate (word boundary + ellipsis) in
 * the og/twitter/meta head tags only — copy is never rewritten. */
export const META_DESCRIPTION_MAX = 160;

export function truncateDescription(description: string): string {
  if (description.length <= META_DESCRIPTION_MAX) return description;
  const slice = description.slice(0, META_DESCRIPTION_MAX);
  const boundary = slice.lastIndexOf(" ");
  const head = boundary > 0 ? slice.slice(0, boundary) : slice;
  return `${head.replace(/[\s,.;:!-]+$/, "")}…`;
}

/** Profile links for the homepage Person JSON-LD — ONLY links actually
 * present in the content files (src/content/contacts.json /
 * sections.json; test/seo-snapshot.test.js asserts each appears there). */
export const PERSON_SAME_AS = [
  "https://github.com/akinevz",
  "https://github.com/akinevz2",
  "https://soundcloud.com/akinevz",
  "https://soundcloud.com/akinevz2",
  "https://www.instagram.com/akinevz2/",
  "https://www.linkedin.com/in/akinevz/",
  "https://www.twitch.tv/akinevz",
  "https://x.com/akinevz",
];

/** The homepage's Person entity. No invented fields: name, url, sameAs. */
export function personJsonLd(url: string): object {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Kirill Nevzorov",
    url,
    sameAs: PERSON_SAME_AS,
  };
}

/** A project route's SoftwareSourceCode entity — ONLY fields present in
 * the project json (title, description, github → codeRepository,
 * lastModified → dateModified). No invented fields. */
export function softwareJsonLd(project: {
  title: string;
  description: string;
  github?: string;
  lastModified?: string;
}): object {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    name: project.title,
    description: project.description,
    ...(project.github ? { codeRepository: project.github } : {}),
    ...(project.lastModified ? { dateModified: project.lastModified } : {}),
  };
}
