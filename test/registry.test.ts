import { test } from "node:test";
import assert from "node:assert/strict";
import { HostRegistry } from "../src/registry.ts";

function setup() {
  const watches: { uid: string; fire: () => void; unwatch: () => number }[] = [];
  const unwatched: string[] = [];
  const registry = new HostRegistry<string>((uid, onChange) => {
    const entry = { uid, fire: onChange, unwatch: () => unwatched.push(uid) };
    watches.push(entry);
    return entry.unwatch;
  });
  return { registry, watches, unwatched };
}

test("two hosts on one uid share one watch and both refresh", () => {
  const { registry, watches } = setup();
  const refreshed: string[] = [];
  registry.add("u1", "main", (h) => refreshed.push(h));
  registry.add("u1", "sidebar", (h) => refreshed.push(h));
  assert.equal(watches.length, 1);
  watches[0].fire();
  assert.deepEqual(refreshed, ["main", "sidebar"]);
});

test("unwatch only after the last host of a uid is removed", () => {
  const { registry, unwatched } = setup();
  registry.add("u1", "main", () => {});
  registry.add("u1", "sidebar", () => {});
  registry.remove("main");
  assert.deepEqual(unwatched, []);
  registry.remove("sidebar");
  assert.deepEqual(unwatched, ["u1"]);
});

test("clear unwatches every uid and forgets all hosts", () => {
  const { registry, watches, unwatched } = setup();
  registry.add("u1", "a", () => {});
  registry.add("u2", "b", () => {});
  assert.equal(watches.length, 2);
  assert.deepEqual(registry.hosts().sort(), ["a", "b"]);
  registry.clear();
  assert.deepEqual(unwatched.sort(), ["u1", "u2"]);
  assert.deepEqual(registry.hosts(), []);
});

test("adding the same host twice refreshes it once per change", () => {
  const { registry, watches } = setup();
  let count = 0;
  registry.add("u1", "main", () => count++);
  registry.add("u1", "main", () => count++);
  assert.equal(watches.length, 1);
  watches[0].fire();
  assert.equal(count, 1);
});
