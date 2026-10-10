import assert from "node:assert/strict";
import { test } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testDirectory, "..");

test("Window initially shows the reveal button and keeps section content hidden", async () => {
  const server = await createServer({
    root: projectRoot,
    configFile: path.join(projectRoot, "vite.config.ts"),
    server: { middlewareMode: true },
  });

  try {
    const { Window } = await server.ssrLoadModule(
      "/src/page/components/window/Window.tsx",
    );
    const { SectionProvider } = await server.ssrLoadModule(
      "/src/page/components/SectionContext.tsx",
    );
    const markup = renderToStaticMarkup(
      createElement(
        SectionProvider,
        null,
        createElement(Window, {
          content: {
            heading: "A section",
            content: createElement("p", null, "Section body"),
            metadata: { uuid: "test", depth: 0, index: "0.0" },
          },
        }),
      ),
    );

    assert.ok(markup.includes("A section"));
    assert.ok(markup.includes("Reveal content"));
    assert.ok(markup.includes("Minimize"));
    assert.equal(markup.includes("Section body"), false);
  } finally {
    await server.close();
  }
});

test("open theme sections render their content without a reveal button", async () => {
  const server = await createServer({
    root: projectRoot,
    configFile: path.join(projectRoot, "vite.config.ts"),
    server: { middlewareMode: true },
  });

  try {
    const { Window } = await server.ssrLoadModule(
      "/src/page/components/window/Window.tsx",
    );
    const { SectionProvider } = await server.ssrLoadModule(
      "/src/page/components/SectionContext.tsx",
    );
    const markup = renderToStaticMarkup(
      createElement(
        SectionProvider,
        null,
        createElement(Window, {
          content: {
            heading: "An open section",
            theme: "open",
            content: createElement("p", null, "Always visible"),
            metadata: { uuid: "open-test", depth: 0, index: "0.0" },
          },
        }),
      ),
    );

    assert.ok(markup.includes("An open section"));
    assert.ok(markup.includes("Always visible"));
    assert.equal(markup.includes("Reveal content"), false);
  } finally {
    await server.close();
  }
});
