import { routes, type Route, type Section } from "@/content";
import { PageWindows } from "@/window";

const inGroup = (paths: string[]): Route[] =>
  routes.filter((route) => paths.includes(route.path));

const GROUPS: Array<{ heading: string; summary: string; routes: Route[] }> = [
  {
    heading: "Core navigation",
    summary: "The pages people are most likely to start with.",
    routes: inGroup(["/", "/blog", "/music"]),
  },
  {
    heading: "Interactive surfaces",
    summary: "The utility pages that support downloads, contact, and tooling.",
    routes: routes.filter(
      (route) =>
        route.page === "ProjectPage" ||
        ["/addons", "/configs", "/contact", "/resume", "/projects"].includes(
          route.path,
        ),
    ),
  },
  {
    heading: "Index and diagnostics",
    summary: "Files and pages that help crawlers understand the site.",
    routes: inGroup(["/sitemap"]),
  },
];

const routeGroup = (group: (typeof GROUPS)[number]): Section => ({
  heading: group.heading,
  theme: "open",
  content: [
    group.summary,
    ...group.routes.map((route) => ({
      heading: route.title,
      link: route.path,
      theme: "open" as const,
      content: [
        `Path: [${route.path}](${route.path})`,
        route.description,
        route.menuLabel && route.menu !== false
          ? `Menu label: ${route.menuLabel}`
          : "Menu label: hidden from navigation",
      ],
    })),
  ],
});

const SITEMAP: Section[] = [
  {
    className: "sitemap-intro",
    heading: "Sitemap",
    theme: "open",
    content: [
      "This page is a human-readable map of the website. It mirrors the crawlable route list and points at the files search engines should use first.",
      "Start with [robots.txt](/robots.txt) and [the XML sitemap](/sitemap.xml), then use the route groups below to jump directly to the part of the site you want.",
    ],
  },
  ...GROUPS.map(routeGroup),
  {
    className: "sitemap-assets",
    heading: "Assets and references",
    theme: "open",
    content: [
      "These are the supporting files that help the site load, render, or surface richer snippets.",
      {
        heading: "Crawler assets",
        theme: "open",
        content: [
          "[robots.txt](/robots.txt)",
          "[XML sitemap](/sitemap.xml)",
          "[SoundCloud snapshot](/soundcloud.json)",
        ],
      },
      {
        heading: "Common public files",
        theme: "open",
        content: [
          "[Resume PDF](/documents/resume.pdf)",
          "[Resume HTML](/resume.html)",
          "[Avatar](/avatar.png)",
          "[Favicon](/favicon.ico)",
          "[Loading stylesheet](/loading.css)",
        ],
      },
    ],
  },
  {
    className: "sitemap-notes",
    heading: "Indexing notes",
    theme: "open",
    content: [
      "The XML sitemap is generated at build time from the same route registry that drives the navigation menu, so the crawl surface stays aligned with the site structure.",
      "The homepage also publishes MusicGroup structured data so the music profile, social links, and latest SoundCloud releases stay discoverable.",
    ],
  },
];

export const SitemapPage = () => <PageWindows content={SITEMAP} />;
