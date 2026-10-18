import { mountDiagram, type DiagramHandle } from "../diagram.ts";
import { createHost } from "../host.ts";
import { HostRegistry } from "../registry.ts";
import { blockUidOf, pullTree, SKIP_CONTEXTS, watch } from "../roam.ts";
import { buildMermaidSource, hasChildren, TREE_PATTERN } from "../source.ts";

export type Target = { scan(): void; sweep(): void; dispose(): void };

type Entry = { frame: Element; uid: string; handle: DiagramHandle };

const HOST_CLASS = "roam-pele--mermaid";

export const createMermaidTarget = (): Target => {
  const entries = new Map<HTMLElement, Entry>();
  const registry = new HostRegistry<HTMLElement>((uid, onChange) => watch(TREE_PATTERN, uid, onChange));

  const destroy = (host: HTMLElement): void => {
    registry.remove(host);
    const entry = entries.get(host);
    entries.delete(host);
    host.remove();
    entry?.handle.destroy();
  };

  // Must not throw: a throwing refresh would starve the other hosts of the same uid.
  const refresh = (host: HTMLElement): void => {
    try {
      const entry = entries.get(host);
      if (!entry) return;
      const root = pullTree(entry.uid);
      // Children gone: drop the host so Roam's own frame (help card) shows again.
      if (!hasChildren(root)) destroy(host);
      else entry.handle.update(buildMermaidSource(root!));
    } catch (e) {
      console.error("roam-pele: mermaid refresh failed", e);
    }
  };

  const mountHost = (frame: Element, uid: string, source: string): void => {
    const { host, diagram } = createHost("mermaid");
    // Attach first so the diagram's computed font size is real.
    frame.after(host);
    try {
      const handle = mountDiagram(diagram, source, {
        ready: () => {
          host.classList.add("roam-pele--ready");
          host.classList.remove("roam-pele--failed");
        },
        fail: () => {
          host.classList.remove("roam-pele--ready");
          host.classList.add("roam-pele--failed");
        },
      });
      entries.set(host, { frame, uid, handle });
      registry.add(uid, host, refresh);
    } catch (e) {
      host.remove();
      console.error("roam-pele: mermaid mount failed", e);
    }
  };

  return {
    scan() {
      for (const el of document.querySelectorAll(".rm-mermaid")) {
        if (el.closest(SKIP_CONTEXTS)) continue;
        const frame = el.closest(".rm-full-width");
        if (!frame || frame.nextElementSibling?.classList.contains(HOST_CLASS)) continue;
        const uid = blockUidOf(frame);
        if (!uid) continue;
        const root = pullTree(uid);
        if (hasChildren(root)) mountHost(frame, uid, buildMermaidSource(root!));
      }
    },
    sweep() {
      for (const [host, { frame }] of [...entries]) {
        if (!host.isConnected || host.previousElementSibling !== frame) destroy(host);
      }
    },
    dispose() {
      for (const host of [...entries.keys()]) destroy(host);
      registry.clear();
    },
  };
};
