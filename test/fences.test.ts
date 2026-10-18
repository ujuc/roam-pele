import { test } from "node:test";
import assert from "node:assert/strict";
import { docMermaidSource, fenceBodies, mermaidSource } from "../src/fences.ts";

test("fenceBodies in order", () =>
  assert.deepEqual(fenceBodies("a ```python\nprint()``` b ```mermaid\nA-->B```"), ["python\nprint()", "mermaid\nA-->B"]));
test("mermaidSource original form", () => assert.equal(mermaidSource("mermaid\ngraph TD\nA-->B"), "graph TD\nA-->B"));
test("mermaidSource rewritten form", () => assert.equal(mermaidSource("javascript\nmermaid\nA-->B"), "A-->B"));
test("mermaidSource other language", () => assert.equal(mermaidSource("python\nprint()"), null));
test("mermaidSource bare mermaid", () => assert.equal(mermaidSource("mermaid"), ""));
test("docMermaidSource", () => {
  assert.equal(docMermaidSource("mermaid\nA-->B"), "A-->B");
  assert.equal(docMermaidSource("foo\nmermaid"), null);
});
