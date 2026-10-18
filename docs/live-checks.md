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

## Task 12 — full live run (scripts/live-check.js)

Graph `test-graph` (local), Chrome, extension loaded in developer mode from `http://localhost:8765` (check 11 ✅: `dev-load-extension extension: http://localhost:8765/` in the console, `window.__roamPeleCleanup` and the extension CSS present). Script run 2026-10-18, selftest page uid `-q2-3NilJ`. Result: 20 PASS, 1 FAIL, 3 manual.

| Check | Result | Detail |
|---|---|---|
| mermaid.render | ✅ | host `--ready`, Roam frame hidden, edge label drawn, `--pele-bg: #ffffff` |
| mermaid.ref-untouched | ✅ | `.rm-mermaid` in the block ref keeps Roam's drawing, no host |
| mermaid.empty-help-card | ✅ | help card shown, no host |
| mermaid.fail-then-recover | ✅ | invalid source → `--failed` + Roam frame visible; fixed → Pele back in ~100 ms |
| mermaid.grandchild-edit | ✅ | redraw ~100 ms after a grandchild edit |
| mermaid.sidebar-both-update | ✅ | main + sidebar both update; main still updates after the sidebar window closes |
| mermaid.edit-button (check 9) | ✅ | synthetic mousedown on the edit button enters edit mode; host back after leaving |
| mermaid.diagram-click-no-edit | ✅ | clicking the diagram does not enter edit mode |
| mermaid.one-host-after-rerenders | ✅ | 1 host per frame after collapse/expand ×2 and edit mode; 0 orphans |
| pele.mindmap | ✅ | outline → `pele-mindmap`, Roam's button hidden |
| pele.colon-form | ✅ | `{{pele: x}}` renders |
| pele.empty-hint | ✅ | "Add Mermaid in child blocks" |
| pele.error-in-place | ✅ | Pele parse error shown in the host |
| pele.edit-button | ❌ → ✅ | failed: the span wrapping Roam's unknown-component button has a React `onMouseDown` that keeps the click from reaching the block's edit handler (also by real click). Fixed in 89571e5: the edit button calls `roamAlphaAPI.ui.setBlockFocusAndSelection`; after reloading (ctrl-d ctrl-r) both the pele and mermaid edit buttons enter edit mode |
| code.preview-above | ✅ | first child of `.rm-code-block`; right edge 1229 = code wrapper right edge (no overflow); `--pele-bg: #f5f5f5` |
| code.two-fences | ✅ | python fence no host, mermaid fence host |
| code.inside-mermaid-source-skipped | ✅ | code block under `{{[[mermaid]]}}` gets no preview |
| code.rewritten-form | ✅ | ```` ```javascript\nmermaid ```` still previewed |
| code.live-typing | ✅ | preview updated ~200 ms after an editor change; block string untouched |
| load.50-diagrams | ✅ | 30 mermaid + 10 pele + 10 code all rendered in 530 ms; one 280 ms long task while opening; 0 long tasks during 20 edits |
| unload.cleanup | ✅ | 0 leftovers, Roam's drawing and pele button back, marker gone, second cleanup call safe |

Manual checks (user, 2026-10-18):
- Settings → Pele: position shows "Above"; the mermaid switch toggles between Roam's drawing and Pele's. ✅
- `/Pele diagram` inserts `{{[[pele]]}}`. ✅
- Convert commands: reported as "not converting". Reproduced in Chrome: with the block in edit mode, `Pele: convert to {{[[mermaid]]}}` changed both `:block/string` and the edit textarea. They looked broken because the drawing is identical for both kinds and the command is a silent no-op without an edited block; 89571e5 adds console warnings and README wording.
