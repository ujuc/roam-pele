import type { DiagramHandle } from "../diagram.ts";
import { HostRegistry } from "../registry.ts";
import { watch } from "../roam.ts";

export type Target = { scan(): void; sweep(): void; dispose(): void };

// handle is null while a host shows no diagram (pele hint, or before the first mount).
type HostEntry = { anchor: Element; uid: string; handle: DiagramHandle | null };

/** Host lifecycle of one target: one watch per block uid; sweep drops hosts that left their place. */
export const createHosts = <E extends HostEntry>(
  name: string,
  pattern: string,
  refresh: (host: HTMLElement, entry: E) => void,
  // Whether the host is still where its target put it; default: right after its anchor.
  inPlace: (host: HTMLElement, entry: E) => boolean = (host, entry) => host.previousElementSibling === entry.anchor,
) => {
  const entries = new Map<HTMLElement, E>();
  const registry = new HostRegistry<HTMLElement>((uid, onChange) => watch(pattern, uid, onChange));

  const destroy = (host: HTMLElement): void => {
    registry.remove(host);
    const entry = entries.get(host);
    entries.delete(host);
    host.remove();
    entry?.handle?.destroy();
  };

  // Must not throw: a throwing refresh would starve the other hosts of the same uid.
  const safeRefresh = (host: HTMLElement): void => {
    try {
      const entry = entries.get(host);
      if (entry) refresh(host, entry);
    } catch (e) {
      console.error(`roam-pele: ${name} refresh failed`, e);
    }
  };

  return {
    add(host: HTMLElement, entry: E): void {
      entries.set(host, entry);
      registry.add(entry.uid, host, safeRefresh);
    },
    destroy,
    refresh: safeRefresh,
    sweep(): void {
      for (const [host, entry] of [...entries]) {
        if (!host.isConnected || !inPlace(host, entry)) destroy(host);
      }
    },
    dispose(): void {
      for (const host of [...entries.keys()]) destroy(host);
      registry.clear();
    },
  };
};
