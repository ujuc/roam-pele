import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { debounceMaxWait } from "../src/observer.ts";

test("fires once after the quiet period", () => {
  mock.timers.enable({ apis: ["setTimeout", "Date"] });
  let calls = 0;
  const d = debounceMaxWait(() => calls++, 100, 500);
  d.trigger();
  mock.timers.tick(99);
  assert.equal(calls, 0);
  mock.timers.tick(1);
  assert.equal(calls, 1);
  mock.timers.reset();
});

test("a constant stream of triggers still fires at the max wait", () => {
  mock.timers.enable({ apis: ["setTimeout", "Date"] });
  let calls = 0;
  const d = debounceMaxWait(() => calls++, 100, 500);
  for (let t = 0; t < 500; t += 50) {
    d.trigger();
    mock.timers.tick(50);
  }
  assert.equal(calls, 1);
  mock.timers.reset();
});

test("cancel drops the pending run", () => {
  mock.timers.enable({ apis: ["setTimeout", "Date"] });
  let calls = 0;
  const d = debounceMaxWait(() => calls++, 100, 500);
  d.trigger();
  d.cancel();
  mock.timers.tick(1000);
  assert.equal(calls, 0);
  mock.timers.reset();
});
