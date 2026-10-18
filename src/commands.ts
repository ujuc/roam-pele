import { focusedBlockUid, pullString, updateBlockString } from "./roam.ts";

type Name = "pele" | "mermaid";

const TOKEN_RE: Record<Name, RegExp> = {
  pele: /\{\{\s*(?:\[\[)?mermaid(?:\]\])?\s*(?::[^}]*)?\}\}/,
  mermaid: /\{\{\s*(?:\[\[)?pele(?:\]\])?\s*(?::[^}]*)?\}\}/,
};

const OTHER: Record<Name, Name> = { pele: "mermaid", mermaid: "pele" };

// Rewrites the first token of the other name to `to`; null when there is none.
export const convertToken = (s: string, to: Name): string | null => {
  const re = TOKEN_RE[to];
  return re.test(s) ? s.replace(re, `{{[[${to}]]}}`) : null;
};

const convertFocused = (to: Name) => async () => {
  const uid = focusedBlockUid();
  if (!uid) return console.warn("roam-pele: convert needs a block in edit mode");
  const current = pullString(uid);
  const next = current ? convertToken(current, to) : null;
  if (next === null) return console.warn(`roam-pele: no {{${OTHER[to]}}} token in the focused block`);
  await updateBlockString(uid, next);
};

type Api = {
  ui: {
    slashCommand: { addCommand(c: { label: string; callback: () => string }): unknown };
    commandPalette: { addCommand(c: { label: string; callback: () => void }): unknown };
  };
};

export const registerCommands = (api: Api): void => {
  api.ui.slashCommand.addCommand({ label: "Pele diagram", callback: () => "{{[[pele]]}}" });
  for (const to of ["pele", "mermaid"] as const)
    api.ui.commandPalette.addCommand({ label: `Pele: convert to {{[[${to}]]}}`, callback: convertFocused(to) });
};
