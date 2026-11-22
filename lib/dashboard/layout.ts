/**
 * Dashboard layout model. Deliberately plain JSON so it can be stored per user
 * (e.g. a Firestore doc at users/{uid}/prefs/dashboard) once auth is added.
 */

export type WidgetId =
  | "verdict"
  | "flow"
  | "wind"
  | "windChart"
  | "air"
  | "pressure"
  | "releases"
  | "storage"
  | "hourly"
  | "sky"
  | "lightning"
  | "gauges";

/** Column span on a 12-column grid. */
export type WidgetSize = "s" | "m" | "l" | "xl";
export const SIZE_SPAN: Record<WidgetSize, number> = { s: 3, m: 4, l: 6, xl: 12 };
export const SIZE_LABEL: Record<WidgetSize, string> = { s: "S", m: "M", l: "L", xl: "Full" };

export interface LayoutItem {
  id: WidgetId;
  size: WidgetSize;
  hidden?: boolean;
}

export interface DashboardLayout {
  version: 1;
  items: LayoutItem[];
}

export const DEFAULT_LAYOUT: DashboardLayout = {
  version: 1,
  items: [
    { id: "verdict", size: "l" },
    { id: "flow", size: "s" },
    { id: "wind", size: "s" },
    { id: "windChart", size: "l" },
    { id: "air", size: "s" },
    { id: "pressure", size: "s" },
    { id: "hourly", size: "xl" },
    { id: "releases", size: "l" },
    { id: "storage", size: "l" },
    { id: "gauges", size: "l" },
    { id: "sky", size: "s" },
    { id: "lightning", size: "s" },
  ],
};

/** Merge a saved layout with the current widget set (new widgets appear, removed ones drop). */
export function normalizeLayout(saved: DashboardLayout | null): DashboardLayout {
  if (!saved || saved.version !== 1 || !Array.isArray(saved.items)) return DEFAULT_LAYOUT;
  const known = new Set(DEFAULT_LAYOUT.items.map((i) => i.id));
  const items = saved.items.filter((i) => known.has(i.id) && i.size in SIZE_SPAN);
  for (const d of DEFAULT_LAYOUT.items) if (!items.some((i) => i.id === d.id)) items.push({ ...d, hidden: true });
  return { version: 1, items };
}

/**
 * Where layouts live. Today: this browser. Later: swap in a Firestore-backed
 * store keyed by the signed-in user, with the same two methods.
 */
export interface LayoutStore {
  load(): Promise<DashboardLayout | null>;
  save(layout: DashboardLayout): Promise<void>;
}

const KEY = "themile.dashboard.v1";

export const browserLayoutStore: LayoutStore = {
  async load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as DashboardLayout) : null;
    } catch {
      return null;
    }
  },
  async save(layout) {
    try {
      localStorage.setItem(KEY, JSON.stringify(layout));
    } catch {
      /* private mode / storage full: layout just won't persist */
    }
  },
};
