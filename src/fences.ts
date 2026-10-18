const FENCE_RE = /`````([\s\S]*?)`````|````([\s\S]*?)````|```([\s\S]*?)```/g;

// Text between each fence pair of a saved block string, info line kept.
export const fenceBodies = (blockString: string): string[] =>
  [...blockString.matchAll(FENCE_RE)].map((m) => m[1] ?? m[2] ?? m[3]);

// shortcut: treats any first line as a language line, fine because Roam shows unknown languages as javascript
export const mermaidSource = (fenceBody: string): string | null => {
  const lines = fenceBody.split("\n");
  if (lines[0].trim() === "mermaid") return lines.slice(1).join("\n");
  if (lines[1]?.trim() === "mermaid") return lines.slice(2).join("\n");
  return null;
};

// The live editor doc has no rewrite yet, so only the first-line form applies.
export const docMermaidSource = (doc: string): string | null => {
  const lines = doc.split("\n");
  return lines[0].trim() === "mermaid" ? lines.slice(1).join("\n") : null;
};
