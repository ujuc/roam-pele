# roam-pele — Design

Date: 2026-10-18
Status: approved 2026-10-18

A Roam Research extension, published through Roam Depot, that draws Mermaid
diagrams with [Pele](https://pele.run) (`obsidianmd/pele`, npm `pele`) instead
of Roam's built-in mermaid.js renderer.

## 1. Intent

The user expects to write many Mermaid diagrams in Roam. Roam's built-in
renderer has three problems the user accepted as the pain points: slow
rendering, colours that do not fit a dark theme, and diagrams that shrink
instead of re-laying out on narrow (mobile) screens. Pele is a small,
dependency-free Mermaid-to-SVG renderer that lays diagrams out for the
available width and is themed through CSS variables.

The user wants to keep writing diagrams the way Roam already supports
(`{{[[mermaid]]}}` with the source in child blocks), and additionally get
Pele previews for fenced ` ```mermaid ` code blocks and a dedicated, faster
`{{[[pele]]}}` block.

## 2. Goals, non-goals, anti-goals

Goals
- G1. Every `{{[[mermaid]]}}` block in the graph is drawn by Pele, with no
  change to how it is written. Turning the extension off brings back Roam's
  own drawing.
- G2. A fenced code block whose content is Mermaid shows a Pele preview inside
  the code block, above or below the editor.
- G3. A new `{{[[pele]]}}` block, written like `{{[[mermaid]]}}`, drawn only by
  Pele (Roam never loads mermaid.js for it), and able to use nested child
  blocks as Mermaid indentation (e.g. `mindmap`).
- G4. All diagrams fit the block width and grow to their natural height,
  so they re-lay out on narrow screens. Target: web and desktop, including
  the right sidebar and narrow windows. The user rarely uses the Roam phone
  app, so it is not a release gate; whether extensions run there is only
  checked and written in the README (§9.7).
- G5. Publishable on Roam Depot.

Non-goals (explicitly out of v1)
- Faster rendering for `{{[[mermaid]]}}` blocks. Roam still runs mermaid.js
  behind the hidden frame; the user accepted this.
- Dark-mode detection in JavaScript. The user does not use a dark theme. Only
  a few CSS rules for common theme marker classes (see §6.4).
- Resize-by-drag, Roam's fullscreen button, Pele zoom, SVG/PNG export, an
  editing UI.
- Mapping Roam's `--mermaidjs-theme` CSS hook or `%%{init: {theme}}%%` onto
  Pele colours (Pele ignores Mermaid themes).
- Stopping Roam from rewriting ` ```mermaid ` to ` ```javascript ` (§7.3).
- Patching Roam's internal (minified) mermaid code.

Anti-goals (failure even if diagrams render)
- A1. Writing to the graph for any reason other than an explicit user command
  (§5). Rendering never writes.
- A2. Breaking Roam editing: click-to-edit, keyboard navigation, code editor
  write-back.
- A3. Leaving DOM nodes, observers, watches or listeners behind after unload,
  or leaving Roam's native mermaid hidden after unload.
- A4. Network calls or remotely loaded code/CSS.
- A5. Per-keystroke work that scales with graph size (full-graph scans).

## 3. Decisions made by the user

- D1. `{{[[mermaid]]}}` uses the "screen swap" approach: hide Roam's rendered
  frame with CSS and draw Pele in an extension-owned element next to it.
  Source is rebuilt from the graph through `roamAlphaAPI`, using Roam's own
  rules. No speed gain is accepted.
- D2. Code-block previews go inside the code block, above or below the editor.
- D3. Add `{{[[pele]]}}`: same writing style as `{{[[mermaid]]}}`, drawn only
  by Pele, faster because Roam never loads mermaid.js for it.
- D4. Diagrams fit the block width with automatic height (no Roam resize box).
  Applies to all three kinds.
- D5. In `{{[[pele]]}}` only, child-block depth becomes Mermaid indentation.
  `{{[[mermaid]]}}` keeps Roam's flat semantics.
- D6. Dark mode is not a target; skip JS detection.
- D7. Live checks run in the Claude app's built-in browser, with the user
  signed in, on a throwaway test graph (§9).
- D8. The Roam phone app is not a target (rarely used); check and document only.

## 4. Facts this design rests on

From reading Roam's served app bundle (build fetched 2026-10-18,
`app-mermaid.js` last-modified 2026-10-12), Pele 1.6.0 source/docs, and the
`Roam-Research/roam-depot` repo. Not observed in a live graph unless noted;
§9 lists what must be checked live.

Roam `{{mermaid}}`
- `{{mermaid}}`, `{{[[mermaid]]}}` and `{{mermaid: …}}` all dispatch to the same
  component. It is lazy-loaded (`/js/compiled/app-mermaid.js`, ~2 MB, mermaid
  11.4.1). There is no `window.mermaid`.
- Source: recursive pull of the whole subtree under the block, pre-order,
  each level sorted by `:block/order`, root string excluded, each
  `:block/string` fence-unwrapped if it contains ```` ``` ```` (3/4/5 backticks;
  the info line, e.g. `mermaid`, is dropped), joined with `"\n"`. Indentation
  is discarded. Zero children → help card.
- DOM: `div.hoverparent.rm-full-width` > [`div.hoveronly` (edit button),
  react-resizable box > `div.hoverparent` > fullscreen button + `div.rm-mermaid`
  > unclassed div (`dangerouslySetInnerHTML` svg, or "Loading...", or
  `div.bp3-card` error)]. Never write inside `.rm-mermaid > div`; React owns it.
- The resizable box stops `mousedown` propagation, so clicking the diagram does
  not enter edit mode. Roam's view-mode `mousedown` handler skips targets with an
  ancestor class containing `dont-focus-block`.
- Block uid from DOM: enclosing `[id^="block-input-"]` (`div.roam-block`) id is
  `block-input-<windowId>-<uid>`; native uids are 9 chars (`id.slice(-9)`).

Unknown components
- Roam renders an unknown `{{name}}` as
  `button.bp3-button.bp3-small.dont-focus-block.rm-xparser-default-<name>`
  (inert). `[[…]]` inside `{{ }}` is unwrapped, so `{{[[pele]]}}` should give
  `rm-xparser-default-pele` and also creates a `[[pele]]` page reference.

Code blocks
- CodeMirror 6, lazy (`app-codemirror.js`). DOM:
  `div.rm-inline-code-block.dont-focus-block` > `div.rm-code-block.rm-code-block--<lang>`
  > [editor wrapper div > `div.cm-editor` …, `div.rm-code-block__settings-bar`].
  `.rm-code-block` can exist before `.cm-editor` appears.
- `mermaid` is not a Roam code language. For an unknown first line, the whole
  content (including the `mermaid` line) becomes the editor doc and the block
  is shown as JavaScript (`rm-code-block--js`). On editor blur, focused change,
  language change or fold change Roam writes back
  ```` ```javascript\nmermaid\n… ``` ````. So in both forms the editor doc's first
  line is `mermaid`.
- Saved `:block/string` lags typing (blur, ~5 s idle, or 75/200 changes). The
  live doc is reachable only through a CodeMirror internal:
  `cmContentEl.cmView.rootView.view.state.doc.toString()`.
- Safe insertion points: first child of `div.rm-code-block` (above), or right
  after `div.rm-code-block__settings-bar` (below). Never inside the editor
  wrapper or `.cm-editor` (React `onBlur` there triggers write-back).
- `.rm-code-block` also appears in block refs, sidebar, embeds, autocomplete
  and find-or-create previews, data-table cells, callouts.

Pele 1.6.0
- ESM only, zero dependencies; `dist/pele.js` bundles into one file
  (~677 KB min, ~251 KB gzip). Ships minified only, no source in the package.
- `render(text, opts)` is sync and throws `PeleError`.
  `mount(el, text, opts)` returns a handle (`update`, `refresh`, `destroy`,
  `error`), tracks container width with `ResizeObserver`, waits while the
  container is hidden, shows errors in-place via `textContent`, and calls
  `onError` / `onRender`. Unique `idPrefix` per mount.
- `zoom` defaults to `'auto'` and adds pointer/keydown/click-capture
  listeners. Use `zoom: false`.
- `fontSize` defaults to 16 and is not read from CSS.
- Colours only via `--pele-*` CSS variables; no `<style>`/`foreignObject` in
  output; labels escaped; links sanitized.
- npm `pele@1.0.0` is an unrelated package. Pin an exact version (1.6.0).
- Young project (created 2026-10-05, 13 releases in 12 days).

Roam Depot
- Published files: `extension.js` (ESM, default export `{onload, onunload}`),
  optional `extension.css`, `README.md`, `CHANGELOG.md`. Nothing else is served,
  so no code-split chunks.
- CI runs `./build.sh` (ubuntu, npm available) within a 5-minute job.
- `extension.css` is injected on load and removed on unload. Commands created
  via `extensionAPI.ui.commandPalette` / `slashCommand` and the settings panel
  are cleaned up automatically; observers, DOM, pull watches are not.
- `roamAlphaAPI.data.addPullWatch(pattern, eid, cb)` (~100 ms debounce);
  always pass all three args to `removePullWatch` or other extensions'
  watches are removed.
- Reviewers read the bundle, test in large graphs, block on performance
  problems, reject remote code, prefer readable bundles, flag large ones.
  Median review ~6 days for new extensions.

## 5. Behaviour

### 5.1 `{{[[mermaid]]}}` (G1, D1, D4)

- Applies to every `.rm-mermaid` that Roam renders in the main view, sidebar
  and embeds. Skip block refs (`.rm-block-ref`) and autocomplete /
  find-or-create previews, as in §5.3, and leave Roam's own drawing there
  *(my call)*. The root uid comes from the enclosing `[id^="block-input-"]`
  element (§4); inside an embed that is the embedded block, which is correct.
- Host structure (one per frame, extension-owned):
  `div.roam-pele` > [`button.roam-pele__edit` (hover-only, no
  `dont-focus-block` on it or any ancestor up to the block), 
  `div.roam-pele__diagram.dont-focus-block` (the Pele mount)]. The host itself
  does not carry `dont-focus-block`. See "Entering edit mode" below.
- For each Roam frame (`div.hoverparent.rm-full-width` containing a
  `.rm-mermaid`), insert the host immediately after the frame. The frame is
  hidden by CSS only while a host that has rendered successfully follows it,
  e.g. `.rm-full-width:has(.rm-mermaid):has(+ .roam-pele--ready)`
  `{ display: none }`. Add `roam-pele--ready` on Pele's first successful
  `onRender`, so a slow or failed mount never shows a blank area. Do not mutate
  React-owned nodes' classes or contents. The selector must match only the
  diagram's own frame, not an ancestor that happens to contain one.
- Source is built from the graph with Roam's rule (§4), plus one addition:
  for a fence-unwrapped child, if its first line is exactly `mermaid`, drop
  it (repairs the JavaScript rewrite; Roam's own renderer fails on it).
- Pele failure (`onError`): remove `roam-pele--ready` and hide the host so
  Roam's native frame shows, and show nothing else. Retry on the next source
  change. *(my call: native fallback, not a Pele error box)*
- Zero children: draw nothing; Roam's help card stays visible (fallback).
- Entering edit mode: hiding the frame also hides Roam's hover edit button,
  and the diagram area's `dont-focus-block` blocks click-to-edit there. So
  `button.roam-pele__edit` re-creates the native affordance: a hover-only
  Blueprint edit button (`bp3-icon-edit`, top-right, like Roam's
  `div.hoveronly`). Its click calls
  `roamAlphaAPI.ui.setBlockFocusAndSelection` for the block (its mousedown is
  stopped and default-prevented), so it does not rely on bubbling to Roam's
  click-to-edit handler. *Live finding:* for `{{[[pele]]}}` the host sits inside
  the span around Roam's unknown-component button, whose React `onMouseDown`
  swallows the event, so bubbling never reached the block. The diagram area keeps
  `dont-focus-block` (links and text selection work, as in native). This
  restores a native function; it is not the "editing UI" non-goal.
  Same structure for §5.2.
- Updates: one recursive `addPullWatch` per root uid, debounced, refreshing all
  hosts for that uid. Remove the watch (with all three args) when no host for
  that uid remains.

### 5.2 `{{[[pele]]}}` (G3, D3, D4, D5)

- Detect `button.rm-xparser-default-pele` (verify live, §9). Insert the host
  right after it and hide the button with CSS while the host is present. When
  the extension is off, Roam shows the inert button and the children remain.
- Accept every form Roam dispatches to `pele`: `{{pele}}`, `{{[[pele]]}}`,
  `{{pele: …}}`. The text after `:` is ignored in v1.
- Source: same traversal as §5.1, but each line of a descendant at depth `d`
  (direct children `d = 0`) is prefixed with `2·d` spaces. Fenced children are
  unwrapped first and every line of the body is indented by the child's depth;
  drop a leading `mermaid` line as in §5.1. Multi-line block strings indent
  every line.
- Pele failure: show Pele's in-place error (`mount` default, `textContent`).
- Zero children: show a one-line hint in the host ("Add Mermaid in child
  blocks") *(my call)*.
- Updates as in §5.1.

### 5.3 Mermaid code blocks (G2, D2, D4)

- A fenced code block is Mermaid when its editor doc's first line, trimmed, is
  exactly `mermaid`. This covers both ```` ```mermaid ```` and Roam's rewritten
  ```` ```javascript\nmermaid ````. The diagram source is the doc minus that line.
- Insert one host per qualifying `.rm-code-block`: as its first child
  ("Above") or right after `.rm-code-block__settings-bar` ("Below"), per the
  setting. Handle `.rm-code-block` appearing before `.cm-editor`.
- Source: read the live editor doc when the CodeMirror internal is available,
  re-rendering on editor changes with a short debounce; otherwise read
  `:block/string` (n-th `.rm-code-block` ↔ n-th fence in the string, verify
  live) and refresh on a pull watch. *(my call: live with automatic fallback)*
- Skip code blocks that are part of a `{{mermaid}}` / `{{pele}}` source (any
  ancestor block is such a root), to avoid a second copy of the same diagram.
  *(my call)*
- Contexts: decorate in main view, sidebar and embeds. Skip block refs
  (`.rm-block-ref`), autocomplete and find-or-create previews. *(my call)*
- Pele failure: in-place Pele error.
- Never write to the block, and never touch the editor wrapper or CM DOM.

### 5.4 Commands

- Slash command "Pele diagram": inserts `{{[[pele]]}}`.
- Command palette, acting on the focused block (writes only on explicit use):
  - "Pele: convert to {{[[pele]]}}" — replaces the `{{mermaid…}}` token in the
    block string with `{{[[pele]]}}`.
  - "Pele: convert to {{[[mermaid]]}}" — the reverse. Nested indentation
    loses its meaning under Roam's renderer; no warning in v1 *(my call)*.
  - Do not touch `:block/props` (Roam stores the resize-box size there).

### 5.5 Settings (`extensionAPI.settings.panel`)

| Setting | Type | Default |
|---|---|---|
| Draw `{{[[mermaid]]}}` with Pele | switch | on |
| Preview Mermaid code blocks | switch | on |
| Code block preview position | select: Above / Below | Above *(my call: matches `{{mermaid}}`, diagram above source)* |

`{{[[pele]]}}` has no switch; it is the extension's own component. Toggling a
setting applies without reload (add/remove hosts and watches).

## 6. Shared rendering

- 6.1 Use `pele.mount(host, source, { zoom: false, fontSize, onError, onRender })`
  per host; `handle.update()` on source change; `destroy()` + remove host when
  the anchor disappears. `fontSize` from the block's computed font size
  *(my call)*.
- 6.2 Hosts are block-level and take the full content width; height is the
  diagram's natural height (no scroll box). Account for Roam's
  `.rm-code-block { margin-right: -116px }`.
- 6.3 One `MutationObserver` on `document.body` (debounced), idempotent via a
  `data-roam-pele` marker. Remove hosts whose anchors are gone. Cache by
  (source, width) so re-renders after remounts are cheap. A page with dozens of
  diagrams must stay responsive; defer off-screen work if needed.
- 6.4 Theme: `extension.css` sets light `--pele-*` values close to Roam's
  palette, and dark values under `.bp3-dark`, `.rs-dark`, `.rm-dark-theme`,
  `.roamjs-custom-dark-theme`. No JS detection.
- 6.5 All extension classes are prefixed `roam-pele`.
- 6.6 Click/keyboard: the diagram element (`.roam-pele__diagram`) carries
  `dont-focus-block`, so clicking a diagram does not enter edit mode; for
  `{{mermaid}}` / `{{pele}}` the separate hover edit button (§5.1) does.
  Code-block previews already sit inside `.rm-inline-code-block.dont-focus-block`
  and need no edit button. Pele zoom is off, so no key handling is added.
  Links in diagrams follow Pele's sanitized `<a>`.

## 7. Constraints and known risks

- 7.1 Build: single `extension.js` (ESM) + `extension.css`; `build.sh` runs
  `npm ci` and the bundler; must finish well inside 5 minutes. Pin
  `pele` to exactly `1.6.0`.
- 7.2 Review risk: Pele adds ~677 KB of minified code. Keep our own code
  unminified and readable; mention the dependency and its size in README.
  Building Pele from source is a later option, not v1.
- 7.3 Roam rewrites ` ```mermaid ` blocks to ` ```javascript\nmermaid ` on the
  first edit/blur/fold. The extension accepts both and does not fight it. The
  README tells users.
- 7.4 Pele targets Mermaid 12.1.0 syntax, Roam ships 11.4.1. A diagram may work
  in one and not the other; §5.1 falls back to native in that case.
  Diagrams that both renderers accept will still look different, and this is
  accepted as part of D1 (no pre-scan, no fallback for it): Pele uses its own
  layout engine; `style` / `classDef` colours are kept (whitelisted SVG
  properties) but ignore the theme; JS `click` callbacks are ignored by both
  (Roam runs mermaid with the default strict security level); `%%{init}%%`
  non-theme config is honoured per diagram type; HTML labels are not supported.
- 7.5 Everything depends on undocumented Roam DOM (class names above). Anchor
  only on class names and `roamAlphaAPI`, never on minified names.
- 7.6 Depot policy on visually overriding a native component is unknown. The
  "Draw `{{[[mermaid]]}}` with Pele" switch is the mitigation; README and the
  Depot PR should say so.
- 7.7 Unload: disconnect observers, `destroy()` and remove all hosts, remove
  every pull watch with all three args, clear markers. Make cleanup idempotent
  and safe to run twice (guard against a double load).

## 8. Left to the builder

Language/tooling (my call: TypeScript + esbuild, `format: "esm"`,
`minify: false`), file layout, test framework and which pure functions to
unit-test (source assembly for both rules, fence unwrap, `mermaid`-line
detection, indentation), exact selectors and debounce values, caching, README
and CHANGELOG wording, the exact light/dark colour values, Roam Depot metadata
JSON (submission itself happens only when the user asks).

## 9. Must be checked live early (dev-mode, test graph)

How (user decision): the user signs in to Roam in the Claude app's built-in
browser; the builder then loads the extension in developer mode and checks in
a throwaway test graph the user names. Never test in the user's real graphs.
The builder never signs in or changes account settings itself.

The first milestone is a small diagnostic build that answers these. If a
result can only be handled by changing a user decision (D1–D8) — e.g. hosts
cannot live next to React-owned nodes, or `{{[[pele]]}}` does not render an
anchor at all — stop and ask the user before going on. Results that only
change selectors or anchoring (e.g. finding a `{{[[pele]]}}` block by uid
instead of by button) are the builder's call.

1. ` ```mermaid ` rewrite on blur/fold, and the editor doc's first line.
2. `{{[[pele]]}}` renders `button.rm-xparser-default-pele`.
3. React keeps foreign siblings next to the mermaid frame, the pele button and
   inside `.rm-code-block` across re-renders and Loading→svg transitions.
4. A recursive `addPullWatch` fires on grandchild edits.
5. n-th `.rm-code-block` ↔ n-th fence in `:block/string`.
6. Live doc read through `cmView` works.
7. Whether Roam Depot extensions run on Roam mobile, and the same DOM there.
8. `:has()` hiding works in Roam's Electron/Chromium and mobile web views.
9. The hover edit button (§5.1) enters edit mode on click, in main view,
   sidebar and embeds.
10. Whether Roam renders `.rm-mermaid` inside block refs at all (§5.1 skips
    them either way).
11. How developer mode loads the extension in the built-in browser: a local
    folder picker may not work there; serving the build from localhost as a
    URL root is the likely path. Settle this first so milestone 1 does not stall.
