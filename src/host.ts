export type HostKind = "mermaid" | "pele" | "code";

const div = (className: string): HTMLDivElement => {
  const el = document.createElement("div");
  el.className = className;
  return el;
};

// Spec 5.1: no dont-focus-block on the host (clicks must stay reachable); only the diagram swallows them.
export const createHost = (kind: HostKind): { host: HTMLDivElement; diagram: HTMLDivElement } => {
  const host = div(`roam-pele roam-pele--${kind}`);
  host.dataset.roamPele = "";
  if (kind === "code") {
    const diagram = div("roam-pele__diagram");
    host.append(diagram);
    return { host, diagram };
  }
  const edit = document.createElement("button");
  edit.type = "button";
  edit.className = "roam-pele__edit bp3-button bp3-minimal bp3-small bp3-icon-edit";
  edit.title = "Edit";
  const diagram = div("roam-pele__diagram dont-focus-block");
  host.append(edit, diagram);
  return { host, diagram };
};
