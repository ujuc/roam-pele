import { observeBody } from "./observer.ts";
import { createMermaidTarget } from "./targets/mermaid.ts";

let stop: (() => void) | undefined;

export default {
  onload() {
    window.__roamPeleCleanup?.();
    const target = createMermaidTarget();
    const disconnect = observeBody(() => {
      target.sweep();
      target.scan();
    });
    target.scan();
    const cleanup = () => {
      disconnect();
      target.dispose();
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
