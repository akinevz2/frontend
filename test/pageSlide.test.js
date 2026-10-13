import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveDirection } from "../src/themes/pageSlide/direction.ts";

const order = ["/", "/music", "/links"];

test("later menu item arrives from the right, earlier from the left", () => {
  assert.equal(resolveDirection("/", "/links", order), "right");
  assert.equal(resolveDirection("/links", "/music", order), "left");
});

test("undecidable ordering slides downwards", () => {
  assert.equal(resolveDirection("/", "/", order), "down");
  assert.equal(resolveDirection("/", "/hidden", order), "down");
  assert.equal(resolveDirection("/x", "/music", order), "down");
});
