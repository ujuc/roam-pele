interface Entry<H> {
  hosts: Map<H, (host: H) => void>;
  unwatch: () => void;
}

/** Keeps exactly one watch per block uid, however many hosts show that block. */
export class HostRegistry<H> {
  private readonly byUid = new Map<string, Entry<H>>();
  private readonly watch: (uid: string, onChange: () => void) => () => void;

  constructor(watch: (uid: string, onChange: () => void) => () => void) {
    this.watch = watch;
  }

  add(uid: string, host: H, refresh: (host: H) => void): void {
    let entry = this.byUid.get(uid);
    if (!entry) {
      const hosts = new Map<H, (host: H) => void>();
      const unwatch = this.watch(uid, () => {
        for (const [h, r] of hosts) r(h);
      });
      entry = { hosts, unwatch };
      this.byUid.set(uid, entry);
    }
    if (!entry.hosts.has(host)) entry.hosts.set(host, refresh);
  }

  remove(host: H): void {
    for (const [uid, entry] of this.byUid) {
      if (entry.hosts.delete(host) && entry.hosts.size === 0) {
        entry.unwatch();
        this.byUid.delete(uid);
      }
    }
  }

  hosts(): H[] {
    return [...this.byUid.values()].flatMap((entry) => [...entry.hosts.keys()]);
  }

  clear(): void {
    for (const entry of this.byUid.values()) entry.unwatch();
    this.byUid.clear();
  }
}
