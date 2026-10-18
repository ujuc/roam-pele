import { test } from "node:test";
import assert from "node:assert/strict";
import { uidFromInputId, windowIdFromInputId } from "../src/roam.ts";

test("uidFromInputId takes the last 9 chars of a block input id", () => {
  assert.equal(uidFromInputId("block-input-uXyZ-body-outline-05-07-2025-abcDEF123"), "abcDEF123");
});

test("uidFromInputId returns null without the block-input prefix", () => {
  assert.equal(uidFromInputId("rm-foo"), null);
});

test("windowIdFromInputId drops the prefix and the trailing -<uid>", () => {
  assert.equal(
    windowIdFromInputId("block-input-BlSsM3zKyBeJ0M0YH3XTxvLe4oC2-body-outline--q2-3NilJ-N9chexn3B"),
    "BlSsM3zKyBeJ0M0YH3XTxvLe4oC2-body-outline--q2-3NilJ",
  );
});

test("windowIdFromInputId returns null without the prefix or a window id", () => {
  assert.equal(windowIdFromInputId("rm-foo-abcDEF123"), null);
  assert.equal(windowIdFromInputId("block-input-abcDEF123"), null);
});
