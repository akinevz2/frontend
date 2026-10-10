import assert from "node:assert/strict";
import { test } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testDirectory, "..");

test("ErrorPage renders its error window without an extra wrapper window", async () => {
  const server = await createServer({
    root: projectRoot,
    configFile: path.join(projectRoot, "vite.config.ts"),
    server: { middlewareMode: true },
  });

  try {
    const { ErrorPage } = await server.ssrLoadModule(
      "/src/page/implementations/error/ErrorPage.tsx",
    );
    const { SectionProvider } = await server.ssrLoadModule(
      "/src/page/components/SectionContext.tsx",
    );
    const markup = renderToStaticMarkup(
      createElement(
        SectionProvider,
        null,
        createElement(ErrorPage, {
          error: new Error("Something went wrong"),
          title: "Error: Something went wrong",
        }),
      ),
    );

    assert.match(
      markup,
      /<section class="window error-window"><div class="title-bar">/,
    );
    assert.match(markup, /Error: Something went wrong/);
  } finally {
    await server.close();
  }
});
