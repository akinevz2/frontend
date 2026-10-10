import assert from "node:assert/strict";
import { test } from "node:test";

import { resolvePage, randomPostPath } from "../src/page/routing.ts";

const menuPages = [
    {
        path: "/projects",
        page: "ProjectsPage",
        title: "Projects",
        description: "Projects",
    },
    {
        path: "/blog",
        page: "BlogPage",
        title: "Blog",
        description: "Blog",
    },
    {
        path: "/404",
        page: "NotFoundPage",
        title: "Not found",
        description: "Not found",
    },
];

const projectPages = [
    {
        path: "/projects/rarebert",
        page: "ProjectsPage",
        title: "rarebert",
        description: "rarebert",
        projectId: "rarebert",
    },
];

test("resolves exact menu routes", () => {
    assert.equal(resolvePage(menuPages, "/blog")?.page, "BlogPage");
});

test("resolves registered project subroutes without adding them to the menu", () => {
    const pages = [...menuPages, ...projectPages];
    assert.equal(resolvePage(pages, "/projects/rarebert")?.projectId, "rarebert");
    assert.equal(pages.some(page => page.path === "/projects/rarebert" && page.menuLabel), false);
});

test("resolves random markdown routes", () => {
    assert.equal(randomPostPath("/blog/random/cpus.md"), "/blog/random/cpus.md");
    assert.equal(randomPostPath("/blog/random/../cpu.md"), null);
    assert.equal(randomPostPath("/blog/random/cpus.txt"), null);
});

test("returns the 404 route for unknown paths", () => {
    const notFound = menuPages.find(page => page.path === "/404");
    assert.equal(resolvePage(menuPages, "/missing", notFound)?.page, "NotFoundPage");
});
