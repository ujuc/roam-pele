import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildMermaidSource,
  buildPeleSource,
  DIAGRAM_ROOT_RE,
  hasChildren,
  unwrapFences,
} from "../src/source.ts";
import type { PullBlock } from "../src/source.ts";

const b = (s: string, order: number, children?: PullBlock[]): PullBlock =>
  ({ ":block/string": s, ":block/order": order, ":block/children": children });
const tree = b("{{[[mermaid]]}}", 0, [b("A-->B", 1), b("graph TD", 0, [b("B-->C", 0)])]);

test("unwrapFences strips the info line", () =>
  assert.equal(unwrapFences("```mermaid\ngraph TD\nA-->B```"), "graph TD\nA-->B"));
test("unwrapFences repairs the javascript rewrite", () =>
  assert.equal(unwrapFences("```javascript\nmermaid\ngraph TD\nA-->B```"), "graph TD\nA-->B"));
test("unwrapFences handles 4 backticks", () =>
  assert.equal(unwrapFences("````markdown\nx\n````"), "x"));
test("unwrapFences leaves plain text", () => assert.equal(unwrapFences("A-->B"), "A-->B"));
test("mermaid source is flat pre-order by :block/order", () =>
  assert.equal(buildMermaidSource(tree), "graph TD\nB-->C\nA-->B"));
test("empty child string becomes a blank line", () =>
  assert.equal(buildMermaidSource(b("", 0, [b("graph TD", 0), b("", 1)])), "graph TD\n"));
test("pele source indents two spaces per depth", () =>
  assert.equal(buildPeleSource(tree), "graph TD\n  B-->C\nA-->B"));
test("pele source builds a mindmap from the outline", () =>
  assert.equal(
    buildPeleSource(b("", 0, [b("mindmap", 0, [b("root((Roam))", 0, [b("A", 0), b("B", 1)])])])),
    "mindmap\n  root((Roam))\n    A\n    B"));
test("pele source indents every line of a multi-line or fenced child", () =>
  assert.equal(buildPeleSource(b("", 0, [b("mindmap", 0, [b("```mermaid\nx\ny```", 0)])])), "mindmap\n  x\n  y"));
test("hasChildren", () => {
  assert.equal(hasChildren(null), false);
  assert.equal(hasChildren(b("x", 0)), false);
  assert.equal(hasChildren(tree), true);
});
test("DIAGRAM_ROOT_RE", () => {
  for (const s of ["{{mermaid}}", "{{[[mermaid]]}}", "{{ [[pele]] }}", "{{pele: x}}"]) assert.match(s, DIAGRAM_ROOT_RE);
  for (const s of ["mermaid", "{{[[kroki]]: mermaid:((abc))}}", "{{[[TODO]]}}"]) assert.doesNotMatch(s, DIAGRAM_ROOT_RE);
});
