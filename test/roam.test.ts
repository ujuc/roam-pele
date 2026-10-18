import { test } from "node:test";
import assert from "node:assert/strict";
import { uidFromInputId } from "../src/roam.ts";

test("uidFromInputId takes the last 9 chars of a block input id", () => {
  assert.equal(uidFromInputId("block-input-uXyZ-body-outline-05-07-2025-abcDEF123"), "abcDEF123");
});

test("uidFromInputId returns null without the block-input prefix", () => {
  assert.equal(uidFromInputId("rm-foo"), null);
});
