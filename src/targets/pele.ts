import { mountDiagram, type DiagramHandle } from "../diagram.ts";
import { createHost } from "../host.ts";
import { blockUidOf, pullTree, SKIP_CONTEXTS } from "../roam.ts";
import { buildPeleSource, hasChildren, TREE_PATTERN, type PullBlock } from "../source.ts";
import { createHosts, type Target } from "./hosts.ts";

type Entry = { anchor: Element; uid: string; diagram: HTMLElement; handle: DiagramHandle | null };

const HOST_CLASS = "roam-pele--pele";
const HINT = "Add Mermaid in child blocks";

export const createPeleTarget = (): Target => {
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

  const hosts = createHosts<Entry>("pele", TREE_PATTERN, (_host, entry) => render(entry, pullTree(entry.uid)));

  const mountHost = (anchor: Element, uid: string, root: PullBlock | null): void => {
    const { host, diagram } = createHost("pele");
    // Attach first so the diagram's computed font size is real.
    anchor.after(host);
    try {
      const entry: Entry = { anchor, uid, diagram, handle: null };
      render(entry, root);
      hosts.add(host, entry);
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
    sweep: hosts.sweep,
    dispose: hosts.dispose,
  };
};
