import { focusBlock } from "./roam.ts";
import { openViewer } from "./viewer.ts";

export type HostKind = "mermaid" | "pele" | "code";

const div = (className: string): HTMLDivElement => {
  const el = document.createElement("div");
  el.className = className;
  return el;
};

// Hover button at the top right; Roam's handlers must not see the press (and the button must not take focus).
const button = (className: string, icon: string, title: string, onClick: () => void): HTMLButtonElement => {
  const el = document.createElement("button");
  el.type = "button";
  el.className = `${className} bp3-button bp3-minimal bp3-small bp3-icon-${icon}`;
  el.title = title;
  el.setAttribute("aria-label", title);
  el.addEventListener("mousedown", (e) => {
    e.stopPropagation();
    e.preventDefault();
  });
  el.addEventListener("click", onClick); // click also covers the keyboard
  return el;
};

// Spec 5.1: no dont-focus-block on the host (clicks must stay reachable); only the diagram swallows them.
export const createHost = (kind: HostKind): { host: HTMLDivElement; diagram: HTMLDivElement } => {
  const host = div(`roam-pele roam-pele--${kind}`);
  host.dataset.roamPele = "";
  const actions = div("roam-pele__actions");
  const diagram = div(kind === "code" ? "roam-pele__diagram" : "roam-pele__diagram dont-focus-block");
  actions.append(button("roam-pele__expand", "fullscreen", "Enlarge", () => openViewer(diagram)));
  // Code-block previews sit inside the editor already and need no edit button.
  if (kind !== "code") actions.append(button("roam-pele__edit", "edit", "Edit", () => focusBlock(host)));
  host.append(actions, diagram);
  return { host, diagram };
};
