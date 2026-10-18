import { mount } from "pele";

export type DiagramHandle = { update(source: string): void; destroy(): void };

export const mountDiagram = (
  el: HTMLElement,
  source: string,
  on: { ready?: () => void; fail?: (e: unknown) => void },
): DiagramHandle => {
  const fontSize = parseFloat(getComputedStyle(el).fontSize) || 16;
  const mounted = mount(el, source, { zoom: false, fontSize, onRender: on.ready, onError: on.fail });
  let current = source;
  return {
    update(next) {
      if (next === current) return;
      current = next;
      mounted.update(next);
    },
    destroy() {
      mounted.destroy();
      el.replaceChildren(); // Pele's destroy only stops observing; the SVG would stay.
    },
  };
};
