import { getConditions } from "@/lib/weather";
import { getWater } from "@/lib/water";
import { readTheDay } from "@/lib/verdict";
import { activePeriod, fmtHour, fmtTime, nextPeriod, skyDay } from "@/lib/astro";
import { flowBand, MILE } from "@/lib/config";
import { cardinal, fmt } from "@/lib/units";

/**
 * /lite — the one-bar-of-signal page. Plain server-rendered HTML: no
 * JavaScript, no web fonts, no images. Linked from the footer; noindex.
 */
export const dynamic = "force-dynamic";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export async function GET(req: Request) {
  const auto = new URL(req.url).searchParams.has("auto");
  const [c, w] = await Promise.all([getConditions(), getWater()]);
  const now = Date.now();
  const cur = c.current;
  const flow = w.release.at(-1) ?? null;
  const band = flowBand(flow?.value);
  const day = skyDay(new Date(now));
  const active = activePeriod(day, now);
  const next = nextPeriod(day, now);
  const v = readTheDay(cur, flow?.value ?? null, c.hourly, Boolean(active));
  const ago = cur ? Math.round((now - Date.parse(cur.observedAt)) / 60_000) : null;
  const strikes = cur?.lightning?.count3h ?? 0;

  const hours = c.hourly.filter((h) => h.t >= now - 3600_000).slice(0, 12);
  const days = c.daily.slice(0, 3);
  const showPrecip = hours.some((h) => h.precipChance);

  const row = (k: string, val: string) => `<tr><th>${k}</th><td>${val}</td></tr>`;

  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
${auto ? '<meta http-equiv="refresh" content="300">' : ""}
<title>The Mile · lite</title>
<style>
body{margin:0 auto;max-width:34em;padding:12px 14px 24px;font:16px/1.4 system-ui,sans-serif;background:#f4efe4;color:#1c231f}
h1{font-size:20px;margin:0}h2{font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#5b645d;margin:20px 0 6px;border-bottom:1px solid #d4cab6;padding-bottom:3px}
p{margin:6px 0}.m{color:#5b645d;font-size:13px}.v{font-size:19px;font-weight:600}
table{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums}th,td{text-align:left;padding:3px 6px 3px 0;vertical-align:top}th{font-weight:500;color:#5b645d;white-space:nowrap}
.h td,.h th{font-size:14px;border-bottom:1px solid #e5ddcc}.warn{background:#a33a2c;color:#fff;padding:8px 10px;font-weight:600}
a{color:#2b5a4d}nav a{margin-right:14px}
@media(prefers-color-scheme:dark){body{background:#111613;color:#ebe5d6}.m,th,h2{color:#9a9e93}h2{border-color:#2c3630}.h td,.h th{border-color:#222b26}a{color:#8cc7b1}}
</style></head><body>
<h1>The Mile · lite</h1>
<p class="m">${new Date(now).toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit", timeZone: MILE.timezone })} MT${
    cur ? ` · ${esc(cur.stationName)}, ${ago != null && ago < 2 ? "just now" : `${ago} min old`}` : " · station offline"
  }</p>
${strikes > 0 ? `<p class="warn">⚡ ${strikes} lightning strike${strikes > 1 ? "s" : ""} in 3 hrs${cur?.lightning?.lastDistanceMi != null ? `, last ~${fmt(cur.lightning.lastDistanceMi)} mi away` : ""}. Get off the water.</p>` : ""}
<p class="v">${esc(v.headline)}</p>
<p>${esc(v.notes[0] ?? "")}</p>

<h2>Now</h2>
<table>
${row("Wind", `<b>${fmt(cur?.windMph)} mph</b> from ${cardinal(cur?.windDir)}${cur?.gustMph != null ? `, gust ${fmt(cur.gustMph)}` : ""}`)}
${row("Air", `<b>${fmt(cur?.tempF)}°F</b>${cur?.feelsLikeF != null ? `, feels ${fmt(cur.feelsLikeF)}°` : ""}`)}
${row("Pressure", `${fmt(cur?.pressureInHg, 2)} inHg${cur?.pressureTrend ? `, ${cur.pressureTrend}` : ""}`)}
${cur?.precipTodayIn != null ? row("Rain today", `${fmt(cur.precipTodayIn, 2)} in`) : ""}
${row("Flow", flow ? `<b>${Math.round(flow.value)} cfs</b> (${flow.date.slice(5).replace("-", "/")})${band ? ` · ${band.label.toLowerCase()}` : ""}` : "—")}
</table>

<h2>Next 12 hours</h2>
${
  hours.length
    ? `<table class="h"><tr><th>Time</th><th>Wind</th><th>Temp</th>${showPrecip ? "<th>Precip</th>" : ""}</tr>${hours
        .map(
          (h) =>
            `<tr><td>${fmtHour(h.t)}</td><td>${fmt(h.windMph)}${h.gustMph != null ? `<span class="m">/${fmt(h.gustMph)}</span>` : ""} ${cardinal(h.windDir)}</td><td>${fmt(h.tempF)}°</td>${showPrecip ? `<td>${h.precipChance ? `${Math.round(h.precipChance)}%` : ""}</td>` : ""}</tr>`,
        )
        .join("")}</table><p class="m">Wind mph / gust, direction it's coming from.</p>`
    : "<p>Forecast unavailable.</p>"
}

${
  days.length
    ? `<h2>Next days</h2><table class="h">${days
        .map(
          (d, i) =>
            `<tr><th>${i === 0 ? "Today" : d.label}</th><td>${fmt(d.highF)}° / ${fmt(d.lowF)}°</td><td>${d.windMph != null ? `${Math.round(d.windMph)} mph` : ""}</td><td>${esc(d.conditions)}</td></tr>`,
        )
        .join("")}</table>`
    : ""
}

<h2>Light</h2>
<table>
${row("First light", fmtTime(day.sun.dawn))}
${row("Sunrise / set", `${fmtTime(day.sun.rise)} / ${fmtTime(day.sun.set)}`)}
${row("Last light", fmtTime(day.sun.dusk))}
${row("Solunar", active ? `<b>${active.kind} period now</b> until ${fmtTime(active.end)}` : next ? `next ${next.kind} ${fmtTime(next.start)}–${fmtTime(next.end)}` : "—")}
</table>

<p style="margin-top:22px"><nav><a href="/lite">Refresh</a>${auto ? '<a href="/lite">Stop auto-refresh</a>' : '<a href="/lite?auto">Auto-refresh (5 min)</a>'}<a href="/">Full site</a></nav></p>
</body></html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
