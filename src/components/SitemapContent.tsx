import { useMemo } from "react";

import pages from "../pages.json";
import { PageContent } from "./Page";
import { processContent } from "../windowing/utils";
import type { PageMetadata, SectionProps } from "../windowing";

type RouteDefinition = {
  path: string;
  title: string;
  description: string;
  menuLabel?: string;
};

type SitemapSection = {
  heading: string;
  summary: string;
  routes: RouteDefinition[];
};

const SITE_ROUTE_DEFINITIONS = pages as RouteDefinition[];

const SITE_ASSETS: SectionProps[] = [
  {
    heading: "Crawler assets",
    link: "/robots.txt",
    content: [
      "[robots.txt](/robots.txt)",
      "[XML sitemap](/sitemap.xml)",
      "[SoundCloud snapshot](/soundcloud.json)",
    ],
  },
  {
    heading: "Common public files",
    content: [
      "[Resume PDF](/resume.pdf)",
      "[Resume HTML](/documents/resume.html)",
      "[Avatar](/avatar.png)",
      "[Favicon](/favicon.ico)",
      "[Loading stylesheet](/loading.css)",
    ],
  },
];

const SITE_MAP_GROUPS: SitemapSection[] = [
  {
    heading: "Core navigation",
    summary: "The pages people are most likely to start with.",
    routes: SITE_ROUTE_DEFINITIONS.filter(({ path }) =>
      ["/", "/blog", "/music"].includes(path),
    ),
  },
  {
    heading: "Interactive surfaces",
    summary: "The utility pages that support downloads, contact, and tooling.",
    routes: SITE_ROUTE_DEFINITIONS.filter(({ path }) =>
      ["/addons", "/wow", "/contact", "/resume"].includes(path),
    ),
  },
  {
    heading: "Index and diagnostics",
    summary: "Files and pages that help crawlers understand the site.",
    routes: SITE_ROUTE_DEFINITIONS.filter(({ path }) =>
      ["/sitemap"].includes(path),
    ),
  },
];

const buildRouteSections = (group: SitemapSection): SectionProps => ({
  heading: group.heading,
  content: [
    group.summary,
    ...group.routes.map((route) => ({
      heading: route.title,
      link: route.path,
      content: [
        `Path: [${route.path}](${route.path})`,
        route.description,
        route.menuLabel
          ? `Menu label: ${route.menuLabel}`
          : "Menu label: hidden from navigation",
      ],
    })),
  ],
});

const buildSitemapSections = (): SectionProps[] => [
  {
    className: "sitemap-intro",
    heading: "Sitemap",
    content: [
      "This page is a human-readable map of the website. It mirrors the crawlable route list and points at the files search engines should use first.",
      "Start with [robots.txt](/robots.txt) and [the XML sitemap](/sitemap.xml), then use the route groups below to jump directly to the part of the site you want.",
    ],
  },
  ...SITE_MAP_GROUPS.map(buildRouteSections),
  {
    className: "sitemap-assets",
    heading: "Assets and references",
    content: [
      "These are the supporting files that help the site load, render, or surface richer snippets.",
      ...SITE_ASSETS,
    ],
  },
  {
    className: "sitemap-notes",
    heading: "Indexing notes",
    content: [
      "The XML sitemap is generated at build time from the same route registry that drives the navigation menu, so the crawl surface stays aligned with the site structure.",
      "The homepage also publishes MusicGroup structured data so the music profile, social links, and latest SoundCloud releases stay discoverable.",
    ],
  },
];

export default function SitemapContent() {
  const { processed, metadata } = useMemo(() => {
    const sections = buildSitemapSections();
    return processContent(sections);
  }, []);

  return (
    <PageContent
      sections={processed as SectionProps | SectionProps[]}
      pageMetadata={{ sections: metadata } satisfies PageMetadata}
    />
  );
}
