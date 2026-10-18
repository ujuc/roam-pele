import { test } from "node:test";
import assert from "node:assert/strict";
import { convertToken } from "../src/commands.ts";

test("mermaid → pele", () => {
  assert.equal(convertToken("{{[[mermaid]]}}", "pele"), "{{[[pele]]}}");
  assert.equal(convertToken("{{mermaid}}", "pele"), "{{[[pele]]}}");
  assert.equal(convertToken("note {{ [[mermaid]] }} x", "pele"), "note {{[[pele]]}} x");
  assert.equal(convertToken("{{mermaid: big}}", "pele"), "{{[[pele]]}}");
});

test("pele → mermaid", () => assert.equal(convertToken("{{pele}}", "mermaid"), "{{[[mermaid]]}}"));

test("no token", () => {
  assert.equal(convertToken("plain", "pele"), null);
  assert.equal(convertToken("{{[[pele]]}}", "pele"), null);
});
