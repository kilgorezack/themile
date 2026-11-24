/**
 * Decides which push alerts to send from one snapshot of mile.fish/api/summary
 * and what was sent before. Pure (no I/O) so it can be tested.
 *
 * Alert kinds match `alerts.flow/calm/lightning/outlook` in the shared profile.
 */

export type AlertKind = "flow" | "calm" | "lightning" | "outlook";

export interface Alert {
  kind: AlertKind;
  title: string;
  body: string;
  /** milecast:// link the app opens when the notification is tapped */
  link: string;
}

/** The parts of /api/summary the alerts use. */
export interface Summary {
  now: { lightning3h: number | null; lightningLastMi: number | null; lightningLastAt?: number | null } | null;
  flow: { cfs: number; date: string; band: string | null } | null;
  bestWindow: { start: number; end: number; tomorrow: boolean; avgWindMph: number | null } | null;
  daily: { t: number; label: string; highF: number | null; lowF: number | null; precipChance: number | null; windMph: number | null; conditions: string }[];
}

/** Remembered between runs (Firestore system/alerts). */
export interface AlertState {
  flow?: { cfs: number; date: string }; // baseline: last release we told people about
  calmDay?: string; // local date of the last calm-window alert
  lightningAt?: number; // ms, when we last sent a lightning alert
  outlookWeek?: string; // e.g. "2026-11-26", the Thursday we last sent the outlook
}

export const TZ = "America/Denver";
export const RULES = {
  /** a release change worth an alert: at least this many cfs… */
  flowMinCfs: 50,
  /** …and at least this fraction of the previous release */
  flowMinPct: 0.1,
  /** a "calm" best window averages at most this wind */
  calmMaxMph: 8,
  /** send the calm alert up to this long before the window starts */
  calmLeadMs: 2 * 3600_000,
  /** strikes within this distance… */
  lightningMi: 12,
  /** …in the last this-many minutes */
  lightningFreshMs: 20 * 60_000,
  /** don't repeat lightning alerts more often than this */
  lightningQuietMs: 90 * 60_000,
  /** weekend outlook goes out Thursday from this local hour */
  outlookHour: 17,
  /** no alerts (except lightning) outside these local hours */
  dayStart: 6,
  dayEnd: 21,
};

const local = (t: number) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
      weekday: "short",
    })
      .formatToParts(new Date(t))
      .map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour), weekday: parts.weekday as string };
};

const clock = (t: number) =>
  new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" }).format(new Date(t)).replace(":00", "");

const fmtCfs = (n: number) => `${Math.round(n).toLocaleString("en-US")} cfs`;

export function decide(s: Summary, state: AlertState, now = Date.now()): { alerts: Alert[]; state: AlertState } {
  const next: AlertState = { ...state };
  const alerts: Alert[] = [];
  const here = local(now);
  const daytime = here.hour >= RULES.dayStart && here.hour < RULES.dayEnd;

  // Flow: Kortes release moved meaningfully from the last value we announced.
  if (s.flow) {
    const base = state.flow;
    if (!base) {
      next.flow = { cfs: s.flow.cfs, date: s.flow.date }; // first run: set the baseline quietly
    } else {
      const delta = s.flow.cfs - base.cfs;
      const big = Math.abs(delta) >= Math.max(RULES.flowMinCfs, RULES.flowMinPct * base.cfs);
      if (big && daytime) {
        const up = delta > 0;
        alerts.push({
          kind: "flow",
          title: `Kortes release ${up ? "up" : "down"} to ${fmtCfs(s.flow.cfs)}`,
          body: `${up ? "Up" : "Down"} ${fmtCfs(Math.abs(delta))} from ${fmtCfs(base.cfs)}.${s.flow.band ? ` ${s.flow.band}.` : ""}`,
          link: "milecast://water",
        });
        next.flow = { cfs: s.flow.cfs, date: s.flow.date };
      }
    }
  }

  // Calm window: today's best stretch is genuinely calm and about to start.
  const w = s.bestWindow;
  if (
    w &&
    !w.tomorrow &&
    w.avgWindMph != null &&
    w.avgWindMph <= RULES.calmMaxMph &&
    w.end - now >= 3600_000 &&
    w.start - now <= RULES.calmLeadMs &&
    daytime &&
    state.calmDay !== here.date
  ) {
    const started = w.start <= now;
    alerts.push({
      kind: "calm",
      title: started ? `Calm on the Mile until ${clock(w.end)}` : `Calm window ${clock(w.start)}–${clock(w.end)}`,
      body: `Wind around ${Math.round(w.avgWindMph)} mph. The best stretch of the day.`,
      link: "milecast://forecast",
    });
    next.calmDay = here.date;
  }

  // Lightning: a fresh strike close to the Mile. Sent any hour that people might be out.
  const n = s.now;
  if (
    n &&
    (n.lightning3h ?? 0) > 0 &&
    n.lightningLastMi != null &&
    n.lightningLastMi <= RULES.lightningMi &&
    n.lightningLastAt != null &&
    now - n.lightningLastAt <= RULES.lightningFreshMs &&
    now - (state.lightningAt ?? 0) >= RULES.lightningQuietMs &&
    here.hour >= 5 &&
    here.hour < 23
  ) {
    alerts.push({
      kind: "lightning",
      title: "Lightning near the Mile",
      body: `Strike about ${Math.round(n.lightningLastMi)} mi from the station at ${clock(n.lightningLastAt)}. Get off the water and away from the rods.`,
      link: "milecast://conditions",
    });
    next.lightningAt = now;
  }

  // Weekend outlook: Thursday evening, once a week.
  if (here.weekday === "Thu" && here.hour >= RULES.outlookHour && here.hour < RULES.dayEnd && state.outlookWeek !== here.date) {
    const days = s.daily.filter((d) => d.label.startsWith("Sat") || d.label.startsWith("Sun")).slice(0, 2);
    if (days.length) {
      const line = (d: Summary["daily"][number]) =>
        [
          d.label.slice(0, 3),
          d.highF != null ? `${Math.round(d.highF)}°` : null,
          d.windMph != null ? `wind ${Math.round(d.windMph)} mph` : null,
          d.precipChance ? `${Math.round(d.precipChance)}% rain` : null,
        ]
          .filter(Boolean)
          .join(", ");
      alerts.push({
        kind: "outlook",
        title: "Weekend on the Mile",
        body: days.map(line).join(" · "),
        link: "milecast://forecast",
      });
      next.outlookWeek = here.date;
    }
  }

  return { alerts, state: next };
}
