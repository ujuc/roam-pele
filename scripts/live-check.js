// roam-pele live check. Paste into the DevTools console of a Roam tab that has the
// extension loaded in developer mode, on the throwaway graph "test-graph".
// It creates two pages ("roam-pele selftest …" and "roam-pele load …"), runs the
// checks, unloads the extension at the very end, prints a report and copies it to
// the clipboard. Reload the extension afterwards (Roam Depot → developer mode).
(async () => {
  const GRAPH = "test-graph";
  const api = window.roamAlphaAPI;
  if (!api || api.graph.name !== GRAPH) throw new Error(`Run this only in "${GRAPH}" (current: ${api?.graph?.name})`);
  if (typeof window.__roamPeleCleanup !== "function") throw new Error("roam-pele is not loaded in this tab");

  const results = [];
  const record = (id, pass, detail) => results.push({ id, pass: pass === null ? "manual" : pass ? "PASS" : "FAIL", detail });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const waitFor = async (fn, ms = 6000) => {
    const t0 = performance.now();
    while (performance.now() - t0 < ms) {
      try { const v = fn(); if (v) return { v, ms: Math.round(performance.now() - t0) }; } catch {}
      await sleep(100);
    }
    return { v: null, ms };
  };
  const check = async (id, fn) => {
    try { await fn(); } catch (e) { record(id, false, `threw: ${e && e.message}`); }
  };

  const U = () => api.util.generateUID();
  const mk = async (parent, order, string, open = true) => {
    const uid = U();
    await api.data.block.create({ location: { "parent-uid": parent, order }, block: { string, uid, open } });
    return uid;
  };
  const setString = (uid, string) => api.data.block.update({ block: { uid, string } });
  const stamp = new Date().toISOString().slice(11, 19);

  // DOM helpers ------------------------------------------------------------
  const main = () => document.querySelector(".roam-article") || document.body;
  const inputsOf = (uid, root = document) => [...root.querySelectorAll(`[id^="block-input-"][id$="-${uid}"]`)];
  const framesOf = (uid, root) => inputsOf(uid, root).flatMap((i) => [...i.querySelectorAll(".rm-mermaid")])
    .filter((m) => !m.closest(".rm-block-ref")).map((m) => m.closest(".rm-full-width"));
  const hostAfter = (el) => (el && el.nextElementSibling && el.nextElementSibling.classList.contains("roam-pele") ? el.nextElementSibling : null);
  const visible = (el) => !!el && getComputedStyle(el).display !== "none" && getComputedStyle(el).visibility !== "hidden" && el.getBoundingClientRect().height > 0;
  const svgText = (host) => (host && host.querySelector(".roam-pele__diagram svg") ? host.querySelector(".roam-pele__diagram svg").textContent : "");
  const codeBlocksOf = (uid, root) => inputsOf(uid, root).flatMap((i) => [...i.querySelectorAll(".rm-code-block")]);
  const codeHost = (cb) => cb.querySelector(":scope > .roam-pele--code");
  const editing = (uid) => !!document.querySelector(`textarea.rm-block-input[id$="-${uid}"]`);
  const leaveEdit = async () => {
    const ta = document.querySelector("textarea.rm-block-input");
    if (ta) ta.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", keyCode: 27, bubbles: true }));
    await sleep(300);
    if (document.querySelector("textarea.rm-block-input")) document.activeElement?.blur?.();
    await sleep(300);
  };

  // Fixture page -----------------------------------------------------------
  const page = U();
  await api.data.page.create({ page: { title: `roam-pele selftest ${stamp}`, uid: page } });
  const M = await mk(page, 0, "{{[[mermaid]]}}");
  await mk(M, 0, "graph TD");
  const M2 = await mk(M, 1, "A-->|label text|B");
  const GC = await mk(M2, 0, "B-->C");
  const P = await mk(page, 1, "{{[[pele]]}}");
  const P1 = await mk(P, 0, "mindmap");
  const P2 = await mk(P1, 0, "root((Roam))");
  await mk(P2, 0, "Alpha");
  await mk(P2, 1, "Beta");
  const PFORM = await mk(page, 2, "{{pele: x}}");
  await mk(PFORM, 0, "graph LR\nP-->Q");
  const PEMPTY = await mk(page, 3, "{{[[pele]]}}");
  const PBAD = await mk(page, 4, "{{[[pele]]}}");
  await mk(PBAD, 0, "graph TD\nA-->");
  const CODE = await mk(page, 5, "```mermaid\ngraph LR\nX-->Y```");
  const TWO = await mk(page, 6, "```python\nprint(1)``` and ```mermaid\ngraph TD\nC-->D```");
  const REF = await mk(page, 7, `((${M}))`);
  const EMPTY = await mk(page, 8, "{{[[mermaid]]}}");
  const BAD = await mk(page, 9, "{{[[mermaid]]}}");
  await mk(BAD, 0, "graph TD");
  const BAD2 = await mk(BAD, 1, "A-->");
  const INNER = await mk(page, 10, "{{[[mermaid]]}}");
  await mk(INNER, 0, "```mermaid\ngraph TD\nI-->J```");
  await api.ui.mainWindow.openPage({ page: { uid: page } });
  await waitFor(() => framesOf(M, main()).length && hostAfter(framesOf(M, main())[0])?.classList.contains("roam-pele--ready"), 15000);

  // {{[[mermaid]]}} ---------------------------------------------------------
  await check("mermaid.render", async () => {
    const f = framesOf(M, main())[0]; const h = hostAfter(f);
    record("mermaid.render", !!h && h.classList.contains("roam-pele--ready") && !visible(f) && /label text/.test(svgText(h)),
      { host: h?.className, frameVisible: visible(f), hasLabel: /label text/.test(svgText(h)), bg: h && getComputedStyle(h).getPropertyValue("--pele-bg").trim() });
  });
  await check("mermaid.ref-untouched", async () => {
    const refMer = inputsOf(REF, main()).flatMap((i) => [...i.querySelectorAll(".rm-mermaid")]);
    const f = refMer[0]?.closest(".rm-full-width");
    record("mermaid.ref-untouched", refMer.length > 0 && !hostAfter(f) && visible(f), { refMermaids: refMer.length, host: !!hostAfter(f) });
  });
  await check("mermaid.empty-help-card", async () => {
    const card = inputsOf(EMPTY, main()).some((i) => /Mermaidjs lets you/.test(i.textContent));
    const host = inputsOf(EMPTY, main()).some((i) => i.querySelector(".roam-pele"));
    record("mermaid.empty-help-card", card && !host, { card, host });
  });
  await check("mermaid.fail-then-recover", async () => {
    const before = await waitFor(() => { const f = framesOf(BAD, main())[0]; const h = hostAfter(f); return h && h.classList.contains("roam-pele--failed") && visible(f) ? h : null; }, 6000);
    await setString(BAD2, "A-->B");
    const after = await waitFor(() => { const f = framesOf(BAD, main())[0]; const h = hostAfter(f); return h && h.classList.contains("roam-pele--ready") && !visible(f) ? h : null; }, 6000);
    record("mermaid.fail-then-recover", !!before.v && !!after.v, { failedWithNativeVisible: !!before.v, recoveredMs: after.v ? after.ms : null });
  });
  await check("mermaid.grandchild-edit", async () => {
    await setString(GC, "B-->Dee");
    const r = await waitFor(() => /Dee/.test(svgText(hostAfter(framesOf(M, main())[0]))), 6000);
    record("mermaid.grandchild-edit", !!r.v, { updatedMs: r.v ? r.ms : null });
  });
  await check("mermaid.sidebar-both-update", async () => {
    await api.ui.rightSidebar.addWindow({ window: { type: "block", "block-uid": M } });
    const sb = () => document.querySelector("#roam-right-sidebar-content") || document;
    await waitFor(() => framesOf(M, sb()).length && hostAfter(framesOf(M, sb())[0]), 8000);
    await setString(GC, "B-->Eff");
    const both = await waitFor(() => { const hs = framesOf(M, document).map(hostAfter); return hs.length >= 2 && hs.every((h) => /Eff/.test(svgText(h))) ? hs.length : null; }, 6000);
    await api.ui.rightSidebar.removeWindow({ window: { type: "block", "block-uid": M } });
    await sleep(600);
    await setString(GC, "B-->Gee");
    const mainOnly = await waitFor(() => /Gee/.test(svgText(hostAfter(framesOf(M, main())[0]))), 6000);
    record("mermaid.sidebar-both-update", !!both.v && !!mainOnly.v, { hostsUpdated: both.v, mainAfterSidebarClosed: !!mainOnly.v });
  });
  await check("mermaid.edit-button", async () => {
    const h = hostAfter(framesOf(M, main())[0]);
    const btn = h.querySelector(".roam-pele__edit");
    for (const type of ["mousedown", "mouseup", "click"]) btn.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
    const entered = await waitFor(() => editing(M), 3000);
    await leaveEdit();
    const back = await waitFor(() => !editing(M) && hostAfter(framesOf(M, main())[0])?.classList.contains("roam-pele--ready"), 6000);
    record("mermaid.edit-button", !!entered.v && !!back.v, { enteredEditMode: !!entered.v, hostBackAfterLeaving: !!back.v });
  });
  await check("mermaid.diagram-click-no-edit", async () => {
    const d = hostAfter(framesOf(M, main())[0]).querySelector(".roam-pele__diagram");
    for (const type of ["mousedown", "mouseup", "click"]) d.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
    await sleep(800);
    const ed = editing(M);
    if (ed) await leaveEdit();
    record("mermaid.diagram-click-no-edit", !ed, { enteredEditMode: ed });
  });
  await check("mermaid.one-host-after-rerenders", async () => {
    for (let i = 0; i < 2; i++) {
      await api.data.block.update({ block: { uid: M, open: false } }); await sleep(400);
      await api.data.block.update({ block: { uid: M, open: true } }); await sleep(600);
    }
    await sleep(500);
    const frames = [...main().querySelectorAll(".rm-mermaid")].filter((m) => !m.closest(".rm-block-ref")).map((m) => m.closest(".rm-full-width"));
    const counts = frames.map((f) => { let n = 0, s = f.nextElementSibling; while (s && s.classList.contains("roam-pele--mermaid")) { n++; s = s.nextElementSibling; } return n; });
    const orphans = [...main().querySelectorAll(".roam-pele--mermaid")].filter((h) => !h.previousElementSibling?.classList.contains("rm-full-width")).length;
    record("mermaid.one-host-after-rerenders", counts.every((n) => n <= 1) && orphans === 0, { hostsPerFrame: counts, orphans });
  });

  // {{[[pele]]}} ------------------------------------------------------------
  const peleHost = (uid) => { const b = inputsOf(uid, main()).flatMap((i) => [...i.querySelectorAll(".rm-xparser-default-pele")])[0]; return { b, h: hostAfter(b) }; };
  await check("pele.mindmap", async () => {
    const r = await waitFor(() => { const { h } = peleHost(P); return /Alpha/.test(svgText(h)) && /Beta/.test(svgText(h)); }, 6000);
    const { b, h } = peleHost(P);
    record("pele.mindmap", !!r.v && !visible(b), { rendered: !!r.v, buttonVisible: visible(b), svgClass: h?.querySelector("svg")?.getAttribute("class") });
  });
  await check("pele.colon-form", async () => {
    const r = await waitFor(() => /Q/.test(svgText(peleHost(PFORM).h)), 6000);
    record("pele.colon-form", !!r.v, { rendered: !!r.v });
  });
  await check("pele.empty-hint", async () => {
    const r = await waitFor(() => /Add Mermaid in child blocks/.test(peleHost(PEMPTY).h?.textContent || ""), 4000);
    record("pele.empty-hint", !!r.v, { hint: !!r.v });
  });
  await check("pele.error-in-place", async () => {
    const r = await waitFor(() => peleHost(PBAD).h?.querySelector(".pele-error"), 4000);
    record("pele.error-in-place", !!r.v, { error: r.v?.textContent?.slice(0, 80) });
  });
  await check("pele.edit-button", async () => {
    const btn = peleHost(P).h.querySelector(".roam-pele__edit");
    for (const type of ["mousedown", "mouseup", "click"]) btn.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
    const entered = await waitFor(() => editing(P), 3000);
    await leaveEdit();
    record("pele.edit-button", !!entered.v, { enteredEditMode: !!entered.v });
  });

  // Code blocks -------------------------------------------------------------
  await check("code.preview-above", async () => {
    const r = await waitFor(() => { const cb = codeBlocksOf(CODE, main())[0]; const h = cb && codeHost(cb); return h && /Y/.test(h.querySelector("svg")?.textContent || "") ? cb : null; }, 6000);
    const cb = r.v || codeBlocksOf(CODE, main())[0]; const h = cb && codeHost(cb);
    const wrap = cb?.closest(".rm-inline-code-block");
    record("code.preview-above", !!r.v && cb.firstElementChild === h, {
      rendered: !!r.v, firstChild: cb?.firstElementChild === h,
      hostRight: h && Math.round(h.getBoundingClientRect().right), codeWrapperRight: wrap && Math.round(wrap.getBoundingClientRect().right),
      bg: h && getComputedStyle(h).getPropertyValue("--pele-bg").trim(),
    });
  });
  await check("code.two-fences", async () => {
    const cbs = codeBlocksOf(TWO, main());
    record("code.two-fences", cbs.length === 2 && !codeHost(cbs[0]) && !!codeHost(cbs[1]), { blocks: cbs.map((c) => ({ cls: c.className, host: !!codeHost(c) })) });
  });
  await check("code.inside-mermaid-source-skipped", async () => {
    const childCode = [...main().querySelectorAll(".rm-code-block")].filter((c) => {
      const input = c.closest('[id^="block-input-"]'); const uid = input && input.id.slice(-9);
      const parents = uid ? api.data.pull("[{:block/parents [:block/uid]}]", [":block/uid", uid])?.[":block/parents"] || [] : [];
      return parents.some((p) => p[":block/uid"] === INNER);
    });
    record("code.inside-mermaid-source-skipped", childCode.length > 0 && childCode.every((c) => !codeHost(c)), { codeBlocks: childCode.length, withHost: childCode.filter(codeHost).length });
  });
  await check("code.rewritten-form", async () => {
    await setString(CODE, "```javascript\nmermaid\ngraph LR\nX-->Zed```");
    const r = await waitFor(() => { const cb = codeBlocksOf(CODE, main())[0]; return /Zed/.test(cb && codeHost(cb)?.querySelector("svg")?.textContent || ""); }, 6000);
    record("code.rewritten-form", !!r.v, { rendered: !!r.v });
  });
  await check("code.live-typing", async () => {
    const cb = codeBlocksOf(CODE, main())[0];
    const view = cb.querySelector(".cm-content")?.cmView?.rootView?.view;
    if (!view) return record("code.live-typing", false, "no cmView path");
    const original = view.state.doc.toString();
    view.dispatch({ changes: { from: view.state.doc.length, insert: "\nZed-->Wub" } });
    const r = await waitFor(() => /Wub/.test(codeHost(cb)?.querySelector("svg")?.textContent || ""), 4000);
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: original } });
    const saved = api.data.pull("[:block/string]", [":block/uid", CODE])?.[":block/string"];
    record("code.live-typing", !!r.v, { updatedMs: r.v ? r.ms : null, blockStringUnchanged: !/Wub/.test(saved || "") });
  });

  // Load test ---------------------------------------------------------------
  await check("load.50-diagrams", async () => {
    const lp = U();
    await api.data.page.create({ page: { title: `roam-pele load ${stamp}`, uid: lp } });
    let order = 0;
    for (let i = 0; i < 30; i++) { const b = await mk(lp, order++, "{{[[mermaid]]}}"); await mk(b, 0, "graph LR"); await mk(b, 1, `N${i}a-->|e${i}|N${i}b-->N${i}c`); }
    for (let i = 0; i < 10; i++) { const b = await mk(lp, order++, "{{[[pele]]}}"); await mk(b, 0, "flowchart TD"); await mk(b, 1, `P${i}-->Q${i}`); }
    for (let i = 0; i < 10; i++) await mk(lp, order++, `\`\`\`mermaid\ngraph TD\nC${i}-->D${i}\`\`\``);
    const longTasks = [];
    const po = new PerformanceObserver((l) => l.getEntries().forEach((e) => longTasks.push(Math.round(e.duration))));
    try { po.observe({ type: "longtask", buffered: false }); } catch {}
    const t0 = performance.now();
    await api.ui.mainWindow.openPage({ page: { uid: lp } });
    const all = await waitFor(() => {
      const m = [...main().querySelectorAll(".roam-pele--mermaid.roam-pele--ready")].length;
      const p = [...main().querySelectorAll(".roam-pele--pele")].filter((h) => h.querySelector("svg")).length;
      const c = [...main().querySelectorAll(".roam-pele--code")].filter((h) => h.querySelector("svg")).length;
      return m >= 30 && p >= 10 && c >= 10 ? { m, p, c } : null;
    }, 45000);
    const renderMs = Math.round(performance.now() - t0);
    const openTasks = longTasks.splice(0);
    // Typing-like activity: 20 edits to an unrelated block, 50 ms apart.
    const other = await mk(lp, order++, "typing");
    for (let i = 0; i < 20; i++) { await setString(other, `typing ${i}`); await sleep(50); }
    await sleep(800);
    po.disconnect();
    const idleMax = Math.max(0, ...longTasks);
    record("load.50-diagrams", !!all.v && idleMax < 100, { allRendered: all.v, renderMs, longTasksWhileOpening: openTasks.length, maxLongTaskWhileOpening: Math.max(0, ...openTasks), longTasksWhileEditing: longTasks.length, maxLongTaskWhileEditing: idleMax });
    await api.ui.mainWindow.openPage({ page: { uid: page } });
    await sleep(1500);
  });

  // Unload (last) -----------------------------------------------------------
  await check("unload.cleanup", async () => {
    const cleanup = window.__roamPeleCleanup;
    cleanup();
    await sleep(500);
    const f = framesOf(M, main())[0];
    const b = peleHost(P).b;
    let secondCallOk = true;
    try { cleanup(); } catch { secondCallOk = false; }
    await setString(GC, "B-->Hoo");
    await sleep(1200);
    record("unload.cleanup", document.querySelectorAll(".roam-pele, [data-roam-pele]").length === 0 && visible(f) && visible(b) && !window.__roamPeleCleanup && secondCallOk, {
      leftovers: document.querySelectorAll(".roam-pele, [data-roam-pele]").length, nativeMermaidVisible: visible(f), peleButtonVisible: visible(b),
      markerGone: !window.__roamPeleCleanup, secondCallOk,
    });
  });

  record("manual.settings-panel", null, "Settings → Pele: both switches ON and 'Above' on first load; mermaid switch OFF brings back Roam's drawing; 'Below' moves code previews under the language bar");
  record("manual.commands", null, "'/Pele diagram' inserts {{[[pele]]}}; command palette 'Pele: convert to {{[[pele]]}}' / '… {{[[mermaid]]}}' on a focused block");
  record("manual.reload", null, "Reload the extension now (it was unloaded by this script)");

  const summary = { graph: GRAPH, pages: { selftest: page }, passed: results.filter((r) => r.pass === "PASS").length, failed: results.filter((r) => r.pass === "FAIL").length, results };
  const text = JSON.stringify(summary, null, 1);
  console.table(results.map(({ id, pass }) => ({ id, pass })));
  try { copy(text); console.log("roam-pele live check: report copied to clipboard"); } catch { console.log(text); }
  return summary;
})();
