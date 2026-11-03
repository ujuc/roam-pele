# Changelog

## 0.2.0

- Update the bundled Pele from 1.6.0 to 1.13.0 ([release notes](https://github.com/obsidianmd/pele/releases)). Diagrams are drawn by the newer Pele, so some look different:
  - Labels on `style`/`classDef` fills and on chart palette colours pick light or dark text for contrast, so they stay readable in dark themes. Custom fills on subgraphs and similar groups are drawn at full opacity instead of half.
  - Pie, git, timeline, radar, treemap, mindmap, Venn and XY charts take series colours from Mermaid's palette theme variables (`pie1`, `cScale0`, …) when a diagram sets them.
  - Labels support `<sub>`, `<sup>`, `<code>`, `<kbd>`, `<u>` and similar tags, keep text like `List<T>`, and Chinese and Japanese labels wrap between characters.
  - Subgraph layouts have fewer edge crossings and straighter edges.
- Some sources that Pele 1.6.0 accepted are now syntax errors, matching Mermaid: a `%%` comment no longer removes the character before it (Venn, sequence, XY chart, quadrant, gantt, journey, timeline), and a Sankey value that does not start with a number is an error. For `{{[[mermaid]]}}`, Roam's own drawing is then shown; `{{[[pele]]}}` shows Pele's error.
- Error positions count lines as written, including front matter, comments and blank lines.

## 0.1.0

- Draw `{{[[mermaid]]}}` blocks with Pele. Roam's own frame is hidden once Pele has drawn the diagram, and shows again if Pele cannot draw it.
- Add the `{{[[pele]]}}` component: written like `{{[[mermaid]]}}` with the source in child blocks, and nested children become Mermaid indentation.
- Preview Mermaid code blocks with Pele, above or below the editor.
- Add the slash command "Pele diagram".
- Add the command palette commands "Pele: convert to {{[[pele]]}}" and "Pele: convert to {{[[mermaid]]}}".
- Add the "Pele" settings tab: "Draw {{[[mermaid]]}} with Pele", "Preview Mermaid code blocks" and "Code block preview position".
- Add light and dark theme colours for the diagrams.
