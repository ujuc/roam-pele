# Live checks (spec §9)

Graph: `test-graph` (local), Chrome via Claude in Chrome, 2026-10-18.
Probe page `roam-pele probe` (uid `vKol21ghx`, later lost when two tabs held the local graph; recreated as `roam-pele probe 2`, uid `pTSLh9D6r`): `{{[[mermaid]]}}` `p2K-3CAXc` (children `graph TD`, `A-->B` > grandchild `SBkmdhwiX`), `{{[[pele]]}}` `Uq6xq5NX_`, standalone mermaid code block `8qdab9w8D`, two-fence block `3tGro2yOv` (python then mermaid), block ref `04q2jkDb8` → `((p2K-3CAXc))`.

| # | Check | Result | Evidence | Consequence |
|---|---|---|---|---|
| 1 | ```` ```mermaid ```` rewrite on blur/fold | ✅ rewritten on blur | block `aytkFBya2` (probe page 2): clicking into the editor left `:block/string` as ```` ```mermaid\ngraph TD\nA-->B``` ````; clicking out changed it to ```` ```javascript\nmermaid\ngraph TD\nA-->B``` ````; class `rm-code-block--js`, label `javascript`, first `.cm-line` `mermaid` in both states. Fold not tried. | detection by first editor line / both string forms, as planned |
| 2 | `{{[[pele]]}}` anchor | ✅ | `<button class="bp3-button bp3-small dont-focus-block rm-xparser-default-pele">pele</button>`, no next sibling | anchor `button.rm-xparser-default-pele` as planned |
| 3 | foreign siblings survive re-render | ✅ | dummies after the mermaid frame, after the pele button, first child of `.rm-code-block`, after `.rm-code-block__settings-bar` stayed in place after a grandchild edit, collapse/expand, and an external code-string update | sibling-host design holds; edit-mode remount still re-checked in Task 6 |
| 4 | recursive `addPullWatch` fires on grandchild edit | ✅ | `addPullWatch` returns a Promise; callback fired once after updating the grandchild; `removePullWatch(pattern, eid, cb)` returned `null` and the callback stopped firing | `TREE_PATTERN` watch on the root is enough |
| 5 | n-th `.rm-code-block` ↔ n-th fence | ✅ | in `3tGro2yOv`: `.rm-code-block--python` (first line `print(1)`) then `.rm-code-block--js` (first line `mermaid`) | index mapping as planned |
| 6 | live doc via `cmView` | ✅ | `.cm-content.cmView.rootView.view.state.doc.toString()` → `"mermaid\ngraph TD\nA-->B"` | live path works |
| 7 | phone app | not checked | user rarely uses it (D8) | README says "not verified" |
| 8 | `:has()` support | ✅ | `CSS.supports('selector(:has(+ a))') === true` in Chrome | hiding CSS as planned |
| 9 | hover edit button enters edit mode | Task 6 | — | — |
| 10 | `.rm-mermaid` inside block refs | ✅ rendered | second `.rm-mermaid` has `.rm-block-ref` ancestor; its enclosing `block-input-…` id ends with the *referencing* block uid `04q2jkDb8` | skipping `.rm-block-ref` is required (uid would be wrong) |
| 11 | developer-mode loading | pending | — | — |

Other observations:
- Block view id format: `block-input-<userId>-body-outline-<pageUid>-<uid>`. Native uids may contain `-` (`p2K-3CAXc`), so `id.slice(-9)` is right and `split('-').pop()` is wrong.
- Mermaid frame chain: `.rm-mermaid` < `div.hoverparent` < `div.react-resizable` < `div.hoverparent.rm-full-width` < unclassed `div`; SVG at `.rm-mermaid > div > svg`.
- Code block: `div.rm-inline-code-block.dont-focus-block` > `div.rm-code-block.rm-code-block--js` (for mermaid) > [unclassed `div` (editor), `div.rm-code-block__settings-bar`].
- `pull("[:block/string :block/order {:block/children ...}]", [":block/uid", uid])` returns keys `:block/string`, `:block/order`, `:block/children` as planned. `pull("[{:block/parents [:block/string]}]", …)` lists ancestor blocks only (the page has no `:block/string`).

No result so far requires changing a user decision (D1–D8).
