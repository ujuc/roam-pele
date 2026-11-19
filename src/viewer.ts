import { mount } from "pele";

// Inline diagrams keep zoom off (spec 6.1); the viewer is a separate overlay, so Pele's zoom and pan are safe there.

// Pele's colour and font inputs, copied so the overlay matches the diagram whichever theme class sits above it.
const INHERITED = [
  "--pele-bg",
  "--pele-fg",
  "--pele-muted",
  "--pele-line",
  "--pele-surface",
  "--pele-surface-alt",
  "--pele-border",
  "--pele-accent",
  "--pele-critical",
  "--pele-error",
  "font-family",
  "font-size",
] as const;

const sources = new WeakMap<HTMLElement, string>();

/** Remembers what a diagram element currently shows, so the viewer can draw it again. */
export const setSource = (diagram: HTMLElement, source: string | null): void => {
  if (source === null) sources.delete(diagram);
  else sources.set(diagram, source);
};

let close: (() => void) | null = null;

export const closeViewer = (): void => close?.();

/** Opens a full-window view of the diagram; does nothing while the element shows no diagram. */
export const openViewer = (diagram: HTMLElement): void => {
  const source = sources.get(diagram);
  if (source === undefined) return;
  closeViewer();

  const computed = getComputedStyle(diagram);
  const overlay = document.createElement("div");
  overlay.className = "roam-pele-viewer";
  overlay.dataset.roamPele = "";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Diagram");
  for (const name of INHERITED) overlay.style.setProperty(name, computed.getPropertyValue(name));

  const panel = document.createElement("div");
  panel.className = "roam-pele-viewer__panel";
  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "roam-pele-viewer__close bp3-button bp3-minimal bp3-icon-cross";
  closeButton.title = "Close (Esc)";
  closeButton.setAttribute("aria-label", "Close");
  const canvas = document.createElement("div");
  canvas.className = "roam-pele-viewer__diagram";
  panel.append(closeButton, canvas);
  overlay.append(panel);
  document.body.append(overlay);

  const fontSize = parseFloat(computed.fontSize) || 16;
  const mounted = mount(canvas, source, { zoom: { always: true, maxScale: 6 }, fontSize });

  // Pele handles Esc first (reset zoom) and marks it handled; only an unhandled Esc closes.
  const onKey = (e: KeyboardEvent): void => {
    if (e.key !== "Escape" || e.defaultPrevented) return;
    e.preventDefault();
    e.stopPropagation();
    closeViewer();
  };
  const onClick = (e: MouseEvent): void => {
    if (e.target === overlay) closeViewer();
  };
  // Roam's own handlers must not see presses inside the overlay.
  const swallow = (e: Event): void => e.stopPropagation();

  document.addEventListener("keydown", onKey);
  overlay.addEventListener("click", onClick);
  overlay.addEventListener("mousedown", swallow);
  closeButton.addEventListener("click", () => closeViewer());

  const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  canvas.tabIndex = -1;
  canvas.focus({ preventScroll: true });

  close = () => {
    close = null;
    document.removeEventListener("keydown", onKey);
    mounted.destroy();
    overlay.remove();
    previous?.focus({ preventScroll: true });
  };
};
