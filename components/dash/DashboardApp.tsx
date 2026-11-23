"use client";

import { useEffect, useState } from "react";
import type { Conditions, WaterData } from "@/lib/types";
import type { RegionData } from "@/lib/region";
import {
  browserLayoutStore,
  DEFAULT_LAYOUT,
  normalizeLayout,
  SIZE_LABEL,
  SIZE_SPAN,
  type DashboardLayout,
  type LayoutItem,
  type LayoutStore,
} from "@/lib/dashboard/layout";
import { MILE } from "@/lib/config";
import { useLive, useNow } from "../hooks";
import { TopBar } from "../TopBar";
import { Footer } from "../Footer";
import { WIDGETS } from "./widgets";
import { RequireAuth } from "../auth/RequireAuth";

export function DashboardApp({
  conditions,
  water,
  region,
  serverNow,
  store = browserLayoutStore,
}: {
  conditions: Conditions;
  water: WaterData;
  region: RegionData;
  serverNow: number;
  store?: LayoutStore;
}) {
  const now = useNow(serverNow, 30_000);
  const { data: c, stale } = useLive("/api/conditions", conditions, 60_000);
  const { data: w } = useLive("/api/water", water, 30 * 60_000);
  const { data: r } = useLive("/api/region", region, 30 * 60_000);

  const [layout, setLayout] = useState<DashboardLayout>(DEFAULT_LAYOUT);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    store.load().then((saved) => setLayout(normalizeLayout(saved)));
  }, [store]);

  const update = (items: LayoutItem[]) => {
    const next: DashboardLayout = { version: 1, items };
    setLayout(next);
    store.save(next);
  };
  const move = (i: number, dir: -1 | 1) => {
    const items = [...layout.items];
    let j = i + dir;
    while (items[j]?.hidden) j += dir; // skip over hidden tiles
    if (j < 0 || j >= items.length) return;
    [items[i], items[j]] = [items[j], items[i]];
    update(items);
  };
  const patch = (i: number, p: Partial<LayoutItem>) => update(layout.items.map((it, k) => (k === i ? { ...it, ...p } : it)));

  const visible = layout.items.map((it, i) => ({ it, i })).filter(({ it }) => !it.hidden);
  const hidden = layout.items.map((it, i) => ({ it, i })).filter(({ it }) => it.hidden);
  const data = { c, w, r, now };
  const updated = new Date(c.fetchedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: MILE.timezone });

  return (
    <>
      <TopBar active="dashboard" stale={stale} observedAt={c.current?.observedAt ?? null} now={now} />
      <RequireAuth plans feature="Dashboard" blurb="Every reading on one screen: station, flows, reservoirs, gauges and the outlook. Arrange the tiles your way.">
      <main className="wrap dash">
        <header className="dash__head">
          <div>
            <div className="label">Live · updated {updated} MT</div>
            <h1>Dashboard</h1>
          </div>
          <div className="dash__actions">
            {editing && (
              <button type="button" className="btn btn--ghost" onClick={() => update(DEFAULT_LAYOUT.items)}>
                Reset
              </button>
            )}
            <button type="button" className={`btn ${editing ? "btn--solid" : ""}`} onClick={() => setEditing((e) => !e)} aria-pressed={editing}>
              {editing ? "Done" : "Customize"}
            </button>
          </div>
        </header>

        {editing && (
          <div className="dash__tray">
            <span className="label">Hidden</span>
            {hidden.length ? (
              hidden.map(({ it, i }) => (
                <button key={it.id} type="button" className="chip" onClick={() => patch(i, { hidden: false })}>
                  + {WIDGETS[it.id].title}
                </button>
              ))
            ) : (
              <span className="small muted">Nothing hidden. Use × on a tile to hide it.</span>
            )}
            <span className="small muted dash__note">Saved on this device. Sign-in sync is coming.</span>
          </div>
        )}

        <div className={`dgrid ${editing ? "is-editing" : ""}`}>
          {visible.map(({ it, i }) => {
            const def = WIDGETS[it.id];
            return (
              <section key={it.id} className={`dtile span-${SIZE_SPAN[it.size]}`} aria-label={def.title}>
                <div className="dtile__head">
                  <h2 className="label">{def.title}</h2>
                  {editing && (
                    <div className="dtile__tools">
                      <button type="button" aria-label={`Move ${def.title} earlier`} onClick={() => move(i, -1)}>
                        ←
                      </button>
                      <button type="button" aria-label={`Move ${def.title} later`} onClick={() => move(i, 1)}>
                        →
                      </button>
                      {def.sizes.length > 1 &&
                        [...def.sizes]
                          .sort((a, b) => SIZE_SPAN[a] - SIZE_SPAN[b])
                          .map((s) => (
                            <button key={s} type="button" className={s === it.size ? "on" : ""} aria-pressed={s === it.size} aria-label={`Size ${SIZE_LABEL[s]}`} onClick={() => patch(i, { size: s })}>
                              {SIZE_LABEL[s]}
                            </button>
                          ))}
                      <button type="button" aria-label={`Hide ${def.title}`} onClick={() => patch(i, { hidden: true })}>
                        ×
                      </button>
                    </div>
                  )}
                </div>
                <div className="dtile__body">{def.render(data, it.size)}</div>
              </section>
            );
          })}
        </div>
      </main>
      </RequireAuth>
      <Footer source={c.current?.source ?? null} fetchedAt={c.fetchedAt} />
    </>
  );
}
