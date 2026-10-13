import assert from "node:assert/strict";
import { test } from "node:test";
import { offsetFor, resolveDirection } from "../packages/page-slide/src/direction.ts";

const order = ["/", "/music", "/links"];

test("later menu item enters from the right, earlier from the left", () => {
  assert.equal(resolveDirection("/", "/links", order), "right");
  assert.equal(resolveDirection("/links", "/music", order), "left");
});

test("undecidable ordering slides downwards", () => {
  assert.equal(resolveDirection(null, "/", order), "down");
  assert.equal(resolveDirection("/", "/", order), "down");
  assert.equal(resolveDirection("/", "/hidden", order), "down");
  assert.equal(resolveDirection("/x", "/music", order), "down");
});

test("offsets start off-axis for the direction", () => {
  assert.equal(offsetFor("right", "60px").x, "60px");
  assert.equal(offsetFor("left", "60px").x, "calc(-1 * 60px)");
  assert.equal(offsetFor("down", "60px").y, "calc(-1 * 60px)");
});
