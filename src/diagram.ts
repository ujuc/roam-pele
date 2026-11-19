import { mount } from "pele";
import { setSource } from "./viewer.ts";

export type DiagramHandle = { update(source: string): void; destroy(): void };

export const mountDiagram = (
  el: HTMLElement,
  source: string,
  on: { ready?: () => void; fail?: (e: unknown) => void },
): DiagramHandle => {
  const fontSize = parseFloat(getComputedStyle(el).fontSize) || 16;
  const mounted = mount(el, source, { zoom: false, fontSize, onRender: on.ready, onError: on.fail });
  let current = source;
  setSource(el, source);
  return {
    update(next) {
      if (next === current) return;
      current = next;
      setSource(el, next);
      mounted.update(next);
    },
    destroy() {
      setSource(el, null);
      mounted.destroy();
      el.replaceChildren(); // Pele's destroy only stops observing; the SVG would stay.
    },
  };
};
