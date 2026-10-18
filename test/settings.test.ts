import { test } from "node:test";
import assert from "node:assert/strict";
import { createPanel, KEYS, readSettings } from "../src/settings.ts";

const store = (values: Record<string, unknown>) => ({ settings: { get: (key: string) => values[key] ?? null } });

test("unset values fall back to the defaults", () =>
  assert.deepEqual(readSettings(store({})), { mermaid: true, code: true, position: "Above" }));

test("stored values are respected", () =>
  assert.deepEqual(readSettings(store({ [KEYS.mermaid]: false, [KEYS.code]: false, [KEYS.position]: "Below" })), {
    mermaid: false,
    code: false,
    position: "Below",
  }));

test("an unknown position falls back to Above", () =>
  assert.equal(readSettings(store({ [KEYS.position]: "Sideways" })).position, "Above"));

test("onChange saves the new value before applying", async () => {
  const log: string[] = [];
  let config: any;
  const api = {
    settings: {
      set: async (key: string, value: unknown) => void log.push(`set ${key}=${value}`),
      panel: { create: async (c: unknown) => void (config = c) },
    },
  };
  await createPanel(api, () => log.push("apply"));
  const [mermaid, code, position] = config.settings;
  assert.equal(config.tabTitle, "Pele");
  await mermaid.action.onChange({ target: { checked: false } });
  await code.action.onChange({ target: { checked: true } });
  await position.action.onChange("Below");
  assert.deepEqual(log, [
    "set mermaid-override=false",
    "apply",
    "set code-preview=true",
    "apply",
    "set code-position=Below",
    "apply",
  ]);
});
