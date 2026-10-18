import { mountDiagram, type DiagramHandle } from "../diagram.ts";
import { docMermaidSource, fenceBodies, mermaidSource } from "../fences.ts";
import { createHost } from "../host.ts";
import { blockUidOf, isInsideDiagramSource, pullString, SKIP_CONTEXTS } from "../roam.ts";
import { createHosts, type Target } from "./hosts.ts";

type Entry = { anchor: Element; uid: string; diagram: HTMLElement; handle: DiagramHandle | null };

const HOST_CLASS = "roam-pele--code";
const STRING_PATTERN = "[:block/string]";

// Live editor doc through a CodeMirror internal; undefined when that path is gone.
const liveDoc = (codeBlock: Element): string | undefined => {
  const doc = (codeBlock.querySelector(".cm-content") as any)?.cmView?.rootView?.view?.state?.doc?.toString();
  return typeof doc === "string" ? doc : undefined;
};

// Saved-string fallback: the n-th code block of a block is the n-th fence of its string.
const savedSource = (codeBlock: Element, uid: string): string | null => {
  const input = codeBlock.closest('[id^="block-input-"]');
  const siblings = [...(input?.querySelectorAll(".rm-code-block") ?? [])].filter((el) => !el.closest(SKIP_CONTEXTS));
  const string = pullString(uid);
  const body = string === null ? undefined : fenceBodies(string)[siblings.indexOf(codeBlock)];
  return body === undefined ? null : mermaidSource(body);
};

const sourceOf = (codeBlock: Element, uid: string): string | null => {
  const doc = liveDoc(codeBlock);
  return doc === undefined ? savedSource(codeBlock, uid) : docMermaidSource(doc);
};

export const createCodeTarget = (position: () => "Above" | "Below"): Target => {
  // Empty source keeps the host but draws nothing: Pele would complain while the user is still typing.
  const render = (entry: Entry, source: string): void => {
    if (source.trim() === "") {
      const handle = entry.handle;
      entry.handle = null;
      handle?.destroy(); // clears the element
    } else if (entry.handle) entry.handle.update(source);
    else entry.handle = mountDiagram(entry.diagram, source, {}); // Pele shows its own errors in place
  };

  const hosts = createHosts<Entry>(
    "code",
    STRING_PATTERN,
    (host, entry) => {
      const source = sourceOf(entry.anchor, entry.uid);
      if (source === null) hosts.destroy(host);
      else render(entry, source);
    },
    (host, entry) => host.parentElement === entry.anchor,
  );

  // shortcut: a block moved under a diagram root keeps its cached answer until reload
  const insideSource = new Map<string, boolean>();
  const isSourceBlock = (uid: string): boolean => {
    let inside = insideSource.get(uid);
    if (inside === undefined) {
      inside = isInsideDiagramSource(uid);
      insideSource.set(uid, inside);
    }
    return inside;
  };

  const mountHost = (codeBlock: Element, uid: string, source: string): void => {
    const { host, diagram } = createHost("code");
    // Attach first so the diagram's computed font size is real.
    if (position() === "Above") codeBlock.prepend(host);
    else {
      const bar = codeBlock.querySelector(":scope > .rm-code-block__settings-bar");
      if (bar) bar.after(host);
      else codeBlock.append(host);
    }
    try {
      const entry: Entry = { anchor: codeBlock, uid, diagram, handle: null };
      render(entry, source);
      hosts.add(host, entry);
    } catch (e) {
      host.remove();
      console.error("roam-pele: code mount failed", e);
    }
  };

  const scanOne = (codeBlock: Element): void => {
    if (codeBlock.closest(SKIP_CONTEXTS)) return;
    const uid = blockUidOf(codeBlock);
    if (!uid || isSourceBlock(uid)) return;
    const existing = codeBlock.querySelector<HTMLElement>(`:scope > .${HOST_CLASS}`);
    if (existing) {
      hosts.refresh(existing); // live typing: update() is a no-op when the source is unchanged
      return;
    }
    const source = sourceOf(codeBlock, uid);
    if (source !== null) mountHost(codeBlock, uid, source);
  };

  return {
    scan() {
      for (const codeBlock of document.querySelectorAll(".rm-code-block")) {
        try {
          scanOne(codeBlock);
        } catch (e) {
          console.error("roam-pele: code scan failed", e);
        }
      }
    },
    sweep: hosts.sweep,
    dispose() {
      hosts.dispose();
      insideSource.clear();
    },
  };
};
