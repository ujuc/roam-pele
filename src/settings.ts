export const KEYS = { mermaid: "mermaid-override", code: "code-preview", position: "code-position" } as const;

export type Position = "Above" | "Below";
export type Settings = { mermaid: boolean; code: boolean; position: Position };

// Unset (null) means the default: both switches on, Above.
export const readSettings = (api: { settings: { get(key: string): unknown } }): Settings => ({
  mermaid: api.settings.get(KEYS.mermaid) !== false,
  code: api.settings.get(KEYS.code) !== false,
  position: api.settings.get(KEYS.position) === "Below" ? "Below" : "Above",
});

type PanelApi = {
  settings: {
    get(key: string): unknown;
    set(key: string, value: unknown): Promise<unknown>;
    panel: { create(config: object): Promise<unknown> };
  };
};

export const createPanel = async (api: PanelApi, onChange: () => void): Promise<void> => {
  // Roam may not have stored the value when onChange runs: save it ourselves first, then apply.
  const changed = (id: string, read: (arg: any) => unknown) => async (arg: unknown) => {
    await api.settings.set(id, read(arg));
    onChange();
  };
  const checked = (e: any) => Boolean(e?.target?.checked);
  await api.settings.panel.create({
    tabTitle: "Pele",
    settings: [
      {
        id: KEYS.mermaid,
        name: "Draw {{[[mermaid]]}} with Pele",
        action: { type: "switch", onChange: changed(KEYS.mermaid, checked) },
      },
      {
        id: KEYS.code,
        name: "Preview Mermaid code blocks",
        action: { type: "switch", onChange: changed(KEYS.code, checked) },
      },
      {
        id: KEYS.position,
        name: "Code block preview position",
        action: { type: "select", items: ["Above", "Below"], onChange: changed(KEYS.position, (v) => v) },
      },
    ],
  });
};
