import { focusedBlockUid, pullString, updateBlockString } from "./roam.ts";

type Name = "pele" | "mermaid";

const TOKEN_RE: Record<Name, RegExp> = {
  pele: /\{\{\s*(?:\[\[)?mermaid(?:\]\])?\s*(?::[^}]*)?\}\}/,
  mermaid: /\{\{\s*(?:\[\[)?pele(?:\]\])?\s*(?::[^}]*)?\}\}/,
};

// Rewrites the first token of the other name to `to`; null when there is none.
export const convertToken = (s: string, to: Name): string | null => {
  const re = TOKEN_RE[to];
  return re.test(s) ? s.replace(re, `{{[[${to}]]}}`) : null;
};

const convertFocused = (to: Name) => async () => {
  const uid = focusedBlockUid();
  const current = uid && pullString(uid);
  const next = current ? convertToken(current, to) : null;
  if (uid && next !== null) await updateBlockString(uid, next);
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
