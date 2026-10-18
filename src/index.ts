import { registerCommands } from "./commands.ts";
import { observeBody } from "./observer.ts";
import { createPanel, readSettings, seedDefaults, type Position } from "./settings.ts";
import { createCodeTarget } from "./targets/code.ts";
import type { Target } from "./targets/hosts.ts";
import { createMermaidTarget } from "./targets/mermaid.ts";
import { createPeleTarget } from "./targets/pele.ts";

let stop: (() => void) | undefined;

// One target failing must not skip the others.
const guarded = (name: string, work: () => void): void => {
  try {
    work();
  } catch (e) {
    console.error(`roam-pele: ${name} scan failed`, e);
  }
};

export default {
  onload({
    extensionAPI,
  }: {
    extensionAPI: Parameters<typeof registerCommands>[0] &
      Parameters<typeof createPanel>[0] &
      Parameters<typeof seedDefaults>[0];
  }) {
    window.__roamPeleCleanup?.();
    const targets = new Map<string, Target>();
    let position: Position = "Above";
    let stopped = false;

    // Brings one target in line with its switch: created and scanned when turned on, disposed when turned off.
    const sync = (name: string, on: boolean, make: () => Target): void => {
      const current = targets.get(name);
      if (on === (current !== undefined)) return;
      if (current) {
        targets.delete(name);
        current.dispose();
      } else {
        const target = make();
        targets.set(name, target);
        guarded(name, () => target.scan());
      }
    };

    const apply = (): void => {
      if (stopped) return; // a settings change may land after unload
      const settings = readSettings(extensionAPI);
      if (settings.position !== position) {
        position = settings.position;
        // The code target reads the position only when it mounts, so recreate it to move existing previews.
        targets.get("code")?.dispose();
        targets.delete("code");
      }
      sync("mermaid", settings.mermaid, createMermaidTarget);
      sync("pele", true, createPeleTarget);
      sync("code", settings.code, () => createCodeTarget(() => position));
    };

    apply();
    const disconnect = observeBody(() => {
      for (const [name, target] of targets)
        guarded(name, () => {
          target.sweep();
          target.scan();
        });
    });
    const cleanup = () => {
      stopped = true;
      disconnect();
      for (const target of targets.values()) target.dispose();
      targets.clear();
      // Only clear our own marker; a newer instance may have replaced it.
      if (window.__roamPeleCleanup === cleanup) delete window.__roamPeleCleanup;
    };
    stop = cleanup;
    window.__roamPeleCleanup = cleanup;
    registerCommands(extensionAPI);
    // Seed before the panel so its switches show the defaults; the targets already read unset as the default.
    seedDefaults(extensionAPI)
      .catch((e) => console.error("roam-pele: seeding settings failed", e))
      .then(() => (stopped ? undefined : createPanel(extensionAPI, apply)))
      .catch((e) => console.error("roam-pele: settings panel failed", e));
  },
  onunload() {
    stop?.();
    stop = undefined;
  },
};
