import assert from "node:assert/strict";
import { test } from "node:test";
import { buildWindows, flatten } from "../src/window/model.ts";

test("ids count only section objects; adjacent strings merge", () => {
  const [root] = buildWindows([
    { heading: "a", content: ["x", "y", { heading: "b" }, "z", { heading: "c" }] },
  ]);
  assert.equal(root.id, "0");
  assert.deepEqual(root.children.map((c) => c.kind), ["text", "window", "text", "window"]);
  assert.deepEqual(flatten([root]).map((n) => n.id), ["0", "0.0", "0.1"]);
});

test("embeds and banners become their own children", () => {
  const [root] = buildWindows([
    {
      heading: "m",
      content: [{ title: "t", url: "https://x" }, { banner: { image: "i", href: "h", lines: [] } }],
    },
  ]);
  assert.deepEqual(root.children.map((c) => c.kind), ["embed", "banner"]);
});
