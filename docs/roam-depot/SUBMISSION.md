# Roam Depot submission

Submitted 2026-10-18 as
[Roam-Research/roam-depot#1506](https://github.com/Roam-Research/roam-depot/pull/1506)
from the fork branch `ujuc:add-roam-pele`.

- Metadata file: [`roam-pele.json`](roam-pele.json), added to
  [Roam-Research/roam-depot](https://github.com/Roam-Research/roam-depot) as
  `extensions/ujuc/roam-pele.json`. Depot extension id: `ujuc+roam-pele`
  (matches Depot's `^[A-Za-z0-9_+-]+$` check).
- `source_commit`: `4022fa35df4464b91798bff91dade1bc4adff581`, the merge of
  ujuc/roam-pele#2 into `main`. It has the same `src/` as `dc36acf` (the merge
  of ujuc/roam-pele#1, where the measurements below were taken) plus the README
  fixes listed under Open items, "Fixed after `dc36acf`".
- Version: 0.1.0 (`package.json`, `CHANGELOG.md`). Depot metadata has no version
  field; Depot builds and publishes the `source_commit`.
- No `stripe_account`: the extension is free.

Steps:

1. Done: fork roam-depot, add the file, open a PR against `main`. Depot's PR workflow
   (`prBuild.yaml`) clones `source_repo`, checks out `source_commit`, runs
   `./build.sh`, and uploads `README.md`, `CHANGELOG.md`, `extension.js`,
   `extension.css`.
2. When the bot comments, install the Depot-built artifact from its
   PR-shorthand (`ujuc+roam-pele+1506`) on a fresh graph and check the
   settings panel, a first render, unload, and how the README renders inside
   Roam. Reviewers ask for this
   ([#887](https://github.com/Roam-Research/roam-depot/pull/887),
   [#1443](https://github.com/Roam-Research/roam-depot/pull/1443)); developer-mode
   loading from localhost is not the same artifact.

## What reviewers check, and how this repo meets it

Measured on 2026-10-18 against `dc36acf` unless noted. "Live" rows come from
the scripted run in `docs/live-checks.md`, which ran on the build just before
89571e5; `src/` is identical from 89571e5 to `dc36acf`, and after 89571e5 only
the edit buttons were rechecked.

| Check | How roam-pele meets it | Evidence |
|---|---|---|
| Public repo Depot can clone | `ujuc/roam-pele` is public. | `gh repo view` → `PUBLIC` |
| `README.md` (required), `CHANGELOG.md`, `extension.css` | All three are in the repo root. | `git ls-files` |
| One ESM `extension.js` with a default export `{onload, onunload}` | esbuild `--bundle --format=esm`, no code splitting, so there is one file. `extension.js` is built, not committed (`.gitignore`). | Bundle ends with `export { index_default as default }`; `src/index.ts:20-93` |
| `build.sh` finishes inside the 5-minute job | `build.sh` runs `npm ci` and `npm run build`. A fresh clone of `dc36acf` with an empty npm cache built in about 2.1-2.2 s (esbuild itself ~40 ms); three builds gave the same SHA-256 `c36854c7…dfeb8`, and a cold build of `4022fa3` gives the same file (2.3 s). The lockfile (v3) includes `@esbuild/linux-x64`. The `ubuntu-24.04` runner ships Node 22 and npm 10, which meets Pele's `node >=20`. | `/usr/bin/time ./build.sh`; actions/runner-images Ubuntu 24.04 readme |
| No remotely loaded code | No `import()`, `<script>` injection, `eval` or `new Function` anywhere in `extension.js`, Pele included. All code ships in the bundle. | grep over `extension.js` |
| Network | The extension's code makes no requests: no `fetch`, `XMLHttpRequest`, `sendBeacon`, `WebSocket` or `EventSource` in `extension.js`. **But** Pele is mounted with default options (`src/diagram.ts:11`), so an image URL written in a diagram's source (for example a flowchart node `A@{ img: "https://…" }`) becomes an SVG `<image href>`, which the browser loads when the diagram renders. Mermaid `click … href` links stay live and navigate on click (`javascript:` is blocked). README Privacy says both. | Pele 1.6.0 `render()` probe; `extension.js:1269-1281` (`images` option, http/https allowed) |
| Graph text never reaches the DOM unescaped | The extension's own DOM is built with `createElement`, `className` and `textContent`. Pele writes its SVG with `innerHTML` but escapes labels and sanitises links: a probe with `<img src=x onerror=…>` in a label and a `javascript:` click produced neither in the output. Reviewers check this ([#1056](https://github.com/Roam-Research/roam-depot/pull/1056)). | `src/host.ts`; Pele `render()` probe |
| No graph writes beyond what the user asks for | Block text is written only by `updateBlockString` (`src/roam.ts:58-59`), called only by the two convert commands (`src/commands.ts:24`) when a block is in edit mode. The slash command "Pele diagram" returns `{{[[pele]]}}` for Roam to insert at the cursor. Settings go through `extensionAPI.settings`: on load, the defaults are stored for any of the three keys that is unset (`src/settings.ts:20`), and a change is saved (`:34`). `:block/props` is never touched; code-block previews never write. Every other `roamAlphaAPI` call is a read, except `ui.setBlockFocusAndSelection`, which the Edit button calls to enter edit mode. | `grep -rn 'roamAlphaAPI\|settings\.' src/` |
| Cleanup on unload | `onunload` runs `cleanup` (`src/index.ts:70-79`): disconnects the body `MutationObserver` and cancels its timer (`src/observer.ts:35-38`), disposes each target, which destroys every Pele mount (and its `ResizeObserver`), removes every host and its pull watch (`src/targets/hosts.ts:21-27,51-54`, `src/registry.ts:28-44`), then removes any leftover `[data-roam-pele]` and the window marker. Pull watches are removed with all three arguments (`src/roam.ts:45`). A second load first runs the previous cleanup (`src/index.ts:28`). Commands, the settings panel and `extension.css` are removed by Roam (design spec §4, from Depot docs; not checked live). | Live: `unload.cleanup` ✅ (0 leftovers, second cleanup safe), `docs/live-checks.md:54` |
| Performance, including large graphs | No datalog queries: the only reads are `pull`s by block uid (`src/roam.ts:35,38,50`), so the cost follows what is on screen, not graph size. One debounced (100 ms, max 500 ms) observer on `document.body` that ignores mutations inside its own hosts; one pull watch per block uid per target; Pele adds one `ResizeObserver` per diagram. | Live: 30 `{{[[mermaid]]}}` + 10 `{{[[pele]]}}` + 10 code previews rendered in 530 ms, one 280 ms long task on open, none during 20 edits (`docs/live-checks.md:53`) |
| Bundle size and readability | `extension.js` is 952,809 bytes (~953 kB, ~287 kB gzipped). Pele 1.6.0 ships minified only (`dist/pele.js`, 677,679 bytes); esbuild re-prints it with line breaks but keeps the mangled names, so inside `extension.js` Pele is 933,885 bytes (98%). The extension's own code is 18,924 bytes, unminified and readable. README "Bundled dependency" gives these numbers. | `extension.js` lines 166-20715 are Pele (`// node_modules/pele/dist/pele.js` marker to `// src/diagram.ts`) |
| CSS scoping | Every selector in `extension.css` is a `.roam-pele*` class, a dark-theme ancestor plus `.roam-pele*`, or a Roam selector qualified by `:has(+ .roam-pele…)`. Pele injects no stylesheet. | `extension.css` |
| Licences | roam-pele is MIT (`LICENSE`). Pele is MIT, and its `LICENSE` also carries an ISC notice for one Lucide icon ("rotate-ccw", the zoom reset), which is in the bundle although zoom is off. The build adds a one-line Pele attribution banner as the first line of `extension.js`. Depot uploads only README, CHANGELOG, JS and CSS, so README's License section carries Pele's `LICENSE` in full (MIT and the Lucide ISC part). | `node_modules/pele/LICENSE` equals the README copy; `head -1 extension.js` |
| Visually overriding a native component (`{{[[mermaid]]}}`) | The setting "Draw {{[[mermaid]]}} with Pele" (default on) brings Roam's own drawing back without a reload. Roam's frame is hidden by CSS only; no attribute, style or content of Roam's elements is changed, and the extension only inserts its own element next to Roam's frame. If Pele fails, the host is hidden and Roam's frame is shown again. Block references are left alone. | `src/index.ts:57`; live: switch toggles both ways (`docs/live-checks.md:57`), foreign siblings survive re-renders (`:10`), block refs keep Roam's drawing (`:35`) |
| Not duplicating a native feature | Reviewers reject extensions that redo what Roam already does ([#1014](https://github.com/Roam-Research/roam-depot/pull/1014)). The PR text below leads with what Roam's renderer does not do. | — |
| Undocumented internals | Roam DOM class names throughout; code previews read CodeMirror's internal view state (`cmView`) to update while typing, and fall back to `:block/string` when it is missing (`src/targets/code.ts:12-19`). Stated in the PR text. | `docs/live-checks.md:13` |

## Open items

Fixing anything in code or README needs a new merge on `main`, and the
metadata then needs that new `source_commit`. README-only changes count as
"code unchanged" in Depot's `build.clj`, so they can also go in a later update
PR.

Fixed after `dc36acf` (README only, so the code Depot builds is unchanged).
Depot publishes the README, and in `dc36acf` these statements were wrong:

- README, Privacy: "No network requests" was too broad, because image URLs in
  diagram sources are loaded (see the Network row). Now it says the extension
  makes no requests of its own and discloses image URLs and `click` links.
  `images: false` was not adopted, so diagrams keep Pele's image shapes; links
  stay as designed (spec §6.6).
- README, Bundled dependency: said Pele is "about 677 KB minified" of a
  ~930 KB file. Now: Pele ~934 KB of the 953 KB `extension.js`, own code
  ~19 KB.
- Licence notices: README's License section now has Pele's `LICENSE` in full
  (MIT and the Lucide ISC part).

Minor:

- The hover Edit button (`src/host.ts:20-23`) has `title="Edit"` but no
  `aria-label`, so screen readers depend on the `title` fallback.
- README, Commands: "The drawing looks the same after converting, because Pele
  draws both kinds" is wrong when "Draw {{[[mermaid]]}} with Pele" is off (then
  Roam draws `{{[[mermaid]]}}`), when the children are nested (indentation is
  kept under `{{[[pele]]}}` and dropped under `{{[[mermaid]]}}`), and when Pele
  cannot draw the source (`{{[[mermaid]]}}` falls back to Roam, `{{[[pele]]}}`
  shows Pele's error).
- README, Development: "load the extension from that URL (not yet verified)" is
  stale; developer-mode loading was verified (`docs/live-checks.md:30`), and row
  11 of the first table there still says "pending".
- `hosts.dispose()` (`src/targets/hosts.ts:51-54`) has no per-host
  `try/catch`: one throwing `destroy` would skip the remaining hosts and
  `registry.clear()`. Pele 1.6.0's `destroy()` cannot throw today, so this is
  latent.
- The autocomplete skip selector (`.rm-autocomplete__preview-content`,
  `src/roam.ts:4`) was never seen live; README says autocomplete previews keep
  Roam's drawing.
- Pele failing on a diagram it had already drawn (frame revealed after being
  hidden) was not tested live; only fail-then-recover from a fresh render was
  (`docs/live-checks.md:37`).
- README has no screenshot. Reviewers ask for demos
  ([#847](https://github.com/Roam-Research/roam-depot/pull/847)); images need
  absolute `raw.githubusercontent.com` URLs.
- Optional: Pele has `pele/core` and `pele/diagrams/*` subpath exports, which
  could shrink the bundle by registering fewer diagram types.

Resolved, not open: the code preview "Below" position was checked live by the
user on 2026-10-18 (`docs/live-checks.md:60`).

Not verified:

- The build on Linux (timed on macOS arm64, Node 24, only).
- A large real graph (only the 50-diagram test page), and the phone app (the
  README says so).
- How Roam renders this README inside Depot (`{{[[mermaid]]}}` outside code
  spans, four-backtick fences).

## Draft PR description for roam-depot

> Add Mermaid with Pele (`ujuc/roam-pele`)
>
> Roam draws `{{[[mermaid]]}}` in a fixed-size resizable frame with
> mermaid.js 11.4.1. This extension draws them with
> [Pele](https://pele.run) instead: full block width, natural height, re-laid
> out when the width changes, Mermaid 12.1 syntax. It also adds a
> `{{[[pele]]}}` block whose nested children become Mermaid indentation (so a
> mindmap can be an outline), and live previews of Mermaid code blocks.
>
> - Overrides a native component: it hides Roam's `{{[[mermaid]]}}` frame with
>   CSS and inserts its own drawing next to it. The setting "Draw
>   {{[[mermaid]]}} with Pele" turns this off without a reload, and Roam's
>   drawing is shown whenever Pele cannot draw a diagram.
> - Bundle: `extension.js` is about 953 kB. About 934 kB of that is Pele 1.6.0
>   (MIT), which ships minified only; the extension's own code is about 19 kB,
>   unminified (source in `src/`).
> - No remotely loaded code, and the extension makes no network requests of
>   its own. Image URLs written in a diagram's source are loaded like any
>   image; `click` links open only when clicked.
> - Writes block text only when the user runs one of the two convert commands
>   (the slash command returns text for Roam to insert). It stores its three
>   settings, seeding the defaults on first load.
> - No datalog queries; only pulls by block uid.
> - Relies on Roam's DOM class names, and code previews read CodeMirror's
>   internal view state (falling back to `:block/string`), so it may need
>   updates when Roam changes them.
