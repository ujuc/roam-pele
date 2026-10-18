export type PullBlock = {
  ":block/string"?: string;
  ":block/order"?: number;
  ":block/children"?: PullBlock[];
};

export const TREE_PATTERN = "[:block/string :block/order {:block/children ...}]";

// Roam's own fence regex: 5, 4 or 3 backticks, info line dropped.
const FENCE_RE =
  /`````(?:[^\n]*\n)([\s\S]*?)(?:\n?`````)|````(?:[^\n]*\n)([\s\S]*?)(?:\n?````)|```(?:[^\n]*\n)([\s\S]*?)(?:\n?```)/g;

// Roam rewrites an unknown "mermaid" info line to "javascript" and moves the word to line 1 of the body.
const dropMermaidLine = (body: string): string => {
  const nl = body.indexOf("\n");
  const first = nl < 0 ? body : body.slice(0, nl);
  return first.trim() === "mermaid" ? (nl < 0 ? "" : body.slice(nl + 1)) : body;
};

export const unwrapFences = (s: string): string =>
  s.replace(FENCE_RE, (_m, a, b, c) => dropMermaidLine(a ?? b ?? c));

const byOrder = (a: PullBlock, b: PullBlock) => (a[":block/order"] ?? 0) - (b[":block/order"] ?? 0);

// Pre-order walk of the descendants (root excluded); `depth` 0 is a direct child.
const lines = (root: PullBlock, indent: boolean): string[] => {
  const out: string[] = [];
  const walk = (block: PullBlock, depth: number) => {
    for (const child of [...(block[":block/children"] ?? [])].sort(byOrder)) {
      const text = unwrapFences(child[":block/string"] ?? "");
      out.push(indent ? text.split("\n").map((l) => "  ".repeat(depth) + l).join("\n") : text);
      walk(child, depth + 1);
    }
  };
  walk(root, 0);
  return out;
};

export const buildMermaidSource = (root: PullBlock): string => lines(root, false).join("\n");

export const buildPeleSource = (root: PullBlock): string => lines(root, true).join("\n");

export const hasChildren = (root: PullBlock | null): boolean =>
  (root?.[":block/children"]?.length ?? 0) > 0;

// Unanchored: Roam renders the component token wherever it appears in the block text.
export const DIAGRAM_ROOT_RE = /\{\{\s*(?:\[\[)?(?:mermaid|pele)(?:\]\])?\s*(?::[^}]*)?\}\}/;
