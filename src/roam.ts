import { DIAGRAM_ROOT_RE, TREE_PATTERN, type PullBlock } from "./source.ts";

// Read-only renderings of other blocks (block refs, autocomplete previews); targets skip them.
export const SKIP_CONTEXTS = ".rm-block-ref, .rm-autocomplete__preview-content";

const INPUT_PREFIX = "block-input-";

// shortcut: assumes 9-char uids like Roam's generateUID; custom-uid blocks are missed
export const uidFromInputId = (id: string): string | null =>
  id.startsWith(INPUT_PREFIX) ? id.slice(-9) : null;

export const blockUidOf = (el: Element): string | null => {
  const id = el.closest('[id^="block-input-"]')?.id;
  return id ? uidFromInputId(id) : null;
};

const eidOf = (uid: string): [":block/uid", string] => [":block/uid", uid];

export const pullTree = (uid: string): PullBlock | null =>
  window.roamAlphaAPI.data.pull(TREE_PATTERN, eidOf(uid)) ?? null;

export const pullString = (uid: string): string | null =>
  window.roamAlphaAPI.data.pull("[:block/string]", eidOf(uid))?.[":block/string"] ?? null;

export const watch = (pattern: string, uid: string, onChange: () => void): (() => void) => {
  const eid = `[:block/uid "${uid}"]`;
  const cb = () => onChange();
  window.roamAlphaAPI.data.addPullWatch(pattern, eid, cb);
  // All three args: with fewer, Roam removes other extensions' watches too.
  return () => window.roamAlphaAPI.data.removePullWatch(pattern, eid, cb);
};

export const isInsideDiagramSource = (uid: string): boolean => {
  const parents: PullBlock[] =
    window.roamAlphaAPI.data.pull("[{:block/parents [:block/string]}]", eidOf(uid))?.[":block/parents"] ?? [];
  return parents.some((p) => DIAGRAM_ROOT_RE.test(p[":block/string"] ?? ""));
};

export const focusedBlockUid = (): string | null =>
  window.roamAlphaAPI.ui.getFocusedBlock()?.["block-uid"] ?? null;

// The only graph write in the extension; callers run it on explicit user command.
export const updateBlockString = (uid: string, string: string): Promise<unknown> =>
  window.roamAlphaAPI.data.block.update({ block: { uid, string } });
