import { observeBody } from "./observer.ts";
import { createMermaidTarget } from "./targets/mermaid.ts";
import { createPeleTarget } from "./targets/pele.ts";

let stop: (() => void) | undefined;

export default {
  onload() {
    window.__roamPeleCleanup?.();
    const targets = [createMermaidTarget(), createPeleTarget()];
    const disconnect = observeBody(() => {
      for (const target of targets) {
        target.sweep();
        target.scan();
      }
    });
    for (const target of targets) target.scan();
    const cleanup = () => {
      disconnect();
      for (const target of targets) target.dispose();
      // Only clear our own marker; a newer instance may have replaced it.
      if (window.__roamPeleCleanup === cleanup) delete window.__roamPeleCleanup;
    };
    stop = cleanup;
    window.__roamPeleCleanup = cleanup;
  },
  onunload() {
    stop?.();
    stop = undefined;
  },
};
