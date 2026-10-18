import { mountDiagram, type DiagramHandle } from "../diagram.ts";
import { createHost } from "../host.ts";
import { blockUidOf, pullTree, SKIP_CONTEXTS } from "../roam.ts";
import { buildMermaidSource, hasChildren, TREE_PATTERN } from "../source.ts";
import { createHosts, type Target } from "./hosts.ts";

type Entry = { anchor: Element; uid: string; handle: DiagramHandle };

const HOST_CLASS = "roam-pele--mermaid";

export const createMermaidTarget = (): Target => {
  const hosts = createHosts<Entry>("mermaid", TREE_PATTERN, (host, entry) => {
    const root = pullTree(entry.uid);
    // Children gone: drop the host so Roam's own frame (help card) shows again.
    if (!hasChildren(root)) hosts.destroy(host);
    else entry.handle.update(buildMermaidSource(root!));
  });

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
      hosts.add(host, { anchor: frame, uid, handle });
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
    sweep: hosts.sweep,
    dispose: hosts.dispose,
  };
};
