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

// Upper bound for the initial fit, so a one-node diagram does not fill the whole window.
const MAX_FIT = 3;

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
  let mounted: ReturnType<typeof mount> | undefined;

  // Scale the SVG to fit the panel (centred by CSS). Pele's zoom takes the SVG's
  // size when it refreshes as its fit and reset size, so reset first, size, then refresh.
  const fit = (): void => {
    const svg = canvas.firstElementChild;
    if (!(svg instanceof SVGSVGElement)) return;
    const width = Number(svg.getAttribute("width"));
    const height = Number(svg.getAttribute("height"));
    if (!(width > 0 && height > 0)) return;
    const style = getComputedStyle(panel);
    const availWidth = canvas.clientWidth;
    const availHeight =
      panel.clientHeight - (parseFloat(style.paddingTop) || 0) - (parseFloat(style.paddingBottom) || 0);
    const scale = Math.min(availWidth / width, availHeight / height, MAX_FIT);
    if (!(scale > 0)) return;
    mounted?.zoom?.reset();
    svg.style.width = `${width * scale}px`;
    svg.style.height = `${height * scale}px`;
    mounted?.zoom?.refresh();
  };

  // onRender runs inside mount() on the first draw, before `mounted` is set; fit() runs again below.
  mounted = mount(canvas, source, { zoom: { always: true, maxScale: 6 }, fontSize, onRender: fit });
  fit();
  const resizeObserver = new ResizeObserver(() => fit());
  resizeObserver.observe(panel);

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
    resizeObserver.disconnect();
    mounted?.destroy();
    overlay.remove();
    previous?.focus({ preventScroll: true });
  };
};
