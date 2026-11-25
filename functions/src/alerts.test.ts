import { test } from "node:test";
import assert from "node:assert/strict";
import { decide, type Summary } from "./alerts";

// Wed 2026-11-25 10:00 MST (17:00 UTC)
const WED_10AM = Date.parse("2026-11-25T17:00:00Z");
const THU_6PM = Date.parse("2026-11-27T01:00:00Z");
const H = 3600_000;

const base = (over: Partial<Summary> = {}): Summary => ({
  now: { lightning3h: 0, lightningLastMi: null, lightningLastAt: null },
  flow: { cfs: 540, date: "2026-11-25", band: "Prime wading" },
  bestWindow: null,
  daily: [],
  ...over,
});

test("first run sets the flow baseline without alerting", () => {
  const r = decide(base(), {}, WED_10AM);
  assert.equal(r.alerts.length, 0);
  assert.deepEqual(r.state.flow, { cfs: 540, date: "2026-11-25" });
});

test("small flow changes are ignored, big ones alert and move the baseline", () => {
  const state = { flow: { cfs: 540, date: "2026-11-24" } };
  assert.equal(decide(base({ flow: { cfs: 570, date: "2026-11-25", band: null } }), state, WED_10AM).alerts.length, 0);
  const r = decide(base({ flow: { cfs: 650, date: "2026-11-25", band: "Prime wading" } }), state, WED_10AM);
  assert.equal(r.alerts[0].kind, "flow");
  assert.match(r.alerts[0].title, /up to 650 cfs/);
  assert.deepEqual(r.state.flow, { cfs: 650, date: "2026-11-25" });
});

test("flow alerts wait for daytime", () => {
  const night = Date.parse("2026-11-25T09:00:00Z"); // 2 AM MST
  const r = decide(base({ flow: { cfs: 800, date: "2026-11-25", band: null } }), { flow: { cfs: 540, date: "x" } }, night);
  assert.equal(r.alerts.length, 0);
  assert.equal(r.state.flow!.cfs, 540);
});

test("calm window alerts once per day, shortly before it starts", () => {
  const w = { start: WED_10AM + H, end: WED_10AM + 4 * H, tomorrow: false, avgWindMph: 5 };
  const r = decide(base({ bestWindow: w }), {}, WED_10AM);
  assert.equal(r.alerts.filter((a) => a.kind === "calm").length, 1);
  assert.equal(decide(base({ bestWindow: w }), r.state, WED_10AM + 600_000).alerts.filter((a) => a.kind === "calm").length, 0);
  assert.equal(decide(base({ bestWindow: { ...w, avgWindMph: 14 } }), { flow: { cfs: 540, date: "x" } }, WED_10AM).alerts.length, 0);
  assert.equal(decide(base({ bestWindow: { ...w, start: WED_10AM + 5 * H, end: WED_10AM + 8 * H } }), {}, WED_10AM).alerts.length, 0);
});

test("lightning alerts for fresh, close strikes and then goes quiet", () => {
  const now = { lightning3h: 3, lightningLastMi: 6, lightningLastAt: WED_10AM - 5 * 60_000 };
  const r = decide(base({ now }), {}, WED_10AM);
  assert.equal(r.alerts[0].kind, "lightning");
  assert.equal(decide(base({ now }), r.state, WED_10AM + 10 * 60_000).alerts.length, 0);
  assert.equal(decide(base({ now: { ...now, lightningLastMi: 30 } }), {}, WED_10AM).alerts.length, 0);
  assert.equal(decide(base({ now: { ...now, lightningLastAt: WED_10AM - 2 * H } }), {}, WED_10AM).alerts.length, 0);
});

test("weekend outlook goes out Thursday evening, once", () => {
  const daily = [
    { t: 0, label: "Fri", highF: 40, lowF: 20, precipChance: 0, windMph: 10, conditions: "" },
    { t: 0, label: "Sat", highF: 45, lowF: 22, precipChance: 20, windMph: 12, conditions: "" },
    { t: 0, label: "Sun", highF: 38, lowF: 18, precipChance: 0, windMph: 25, conditions: "" },
  ];
  const r = decide(base({ daily }), { flow: { cfs: 540, date: "x" } }, THU_6PM);
  assert.equal(r.alerts.length, 1);
  assert.equal(r.alerts[0].body, "Sat, 45°, wind 12 mph, 20% rain · Sun, 38°, wind 25 mph");
  assert.equal(decide(base({ daily }), r.state, THU_6PM + H).alerts.length, 0);
  assert.equal(decide(base({ daily }), {}, WED_10AM).alerts.filter((a) => a.kind === "outlook").length, 0);
});
