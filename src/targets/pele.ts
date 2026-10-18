import { mountDiagram, type DiagramHandle } from "../diagram.ts";
import { createHost } from "../host.ts";
import { HostRegistry } from "../registry.ts";
import { blockUidOf, pullTree, SKIP_CONTEXTS, watch } from "../roam.ts";
import { buildPeleSource, hasChildren, TREE_PATTERN, type PullBlock } from "../source.ts";
import type { Target } from "./mermaid.ts";

// handle is null while the hint shows (no children) or before the first mount.
type Entry = { anchor: Element; uid: string; diagram: HTMLElement; handle: DiagramHandle | null };

const HOST_CLASS = "roam-pele--pele";
const HINT = "Add Mermaid in child blocks";

export const createPeleTarget = (): Target => {
  const entries = new Map<HTMLElement, Entry>();
  const registry = new HostRegistry<HTMLElement>((uid, onChange) => watch(TREE_PATTERN, uid, onChange));

  const destroy = (host: HTMLElement): void => {
    registry.remove(host);
    const entry = entries.get(host);
    entries.delete(host);
    host.remove();
    entry?.handle?.destroy();
  };

  // Switches between the hint and a diagram; Pele reports its own errors inside the diagram element.
  const render = (entry: Entry, root: PullBlock | null): void => {
    const { diagram } = entry;
    if (hasChildren(root)) {
      const source = buildPeleSource(root!);
      if (entry.handle) entry.handle.update(source);
      else {
        diagram.replaceChildren(); // drop the hint
        entry.handle = mountDiagram(diagram, source, {});
      }
      return;
    }
    const handle = entry.handle;
    entry.handle = null;
    handle?.destroy(); // before the hint: destroy() clears the element
    diagram.textContent = HINT;
  };

  // Must not throw: a throwing refresh would starve the other hosts of the same uid.
  const refresh = (host: HTMLElement): void => {
    try {
      const entry = entries.get(host);
      if (entry) render(entry, pullTree(entry.uid));
    } catch (e) {
      console.error("roam-pele: pele refresh failed", e);
    }
  };

  const mountHost = (anchor: Element, uid: string, root: PullBlock | null): void => {
    const { host, diagram } = createHost("pele");
    // Attach first so the diagram's computed font size is real.
    anchor.after(host);
    const entry: Entry = { anchor, uid, diagram, handle: null };
    try {
      render(entry, root);
      entries.set(host, entry);
      registry.add(uid, host, refresh);
    } catch (e) {
      host.remove();
      console.error("roam-pele: pele mount failed", e);
    }
  };

  return {
    scan() {
      for (const el of document.querySelectorAll("button.rm-xparser-default-pele")) {
        if (el.closest(SKIP_CONTEXTS)) continue;
        if (el.nextElementSibling?.classList.contains(HOST_CLASS)) continue;
        const uid = blockUidOf(el);
        if (!uid) continue;
        mountHost(el, uid, pullTree(uid));
      }
    },
    sweep() {
      for (const [host, { anchor }] of [...entries]) {
        if (!host.isConnected || host.previousElementSibling !== anchor) destroy(host);
      }
    },
    dispose() {
      for (const host of [...entries.keys()]) destroy(host);
      registry.clear();
    },
  };
};
