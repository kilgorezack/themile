"use client";

import { HATCHES, MONTHS } from "@/lib/hatches";
import { MILE } from "@/lib/config";
import { Reveal } from "./Reveal";

const LEVEL = ["—", "present", "good", "peak"];

export function Hatches({ now }: { now: number }) {
  const m = Number(new Date(now).toLocaleString("en-US", { month: "numeric", timeZone: MILE.timezone })) - 1;
  const nowList = HATCHES.filter((h) => h.months[m] >= 2).sort((a, b) => b.months[m] - a.months[m]);

  return (
    <section className="section wrap" id="hatches">
      <Reveal className="section__head">
        <div>
          <div className="section__index label">05 — What they&rsquo;re eating</div>
          <h2>
            Bugs &amp; <em>runs</em> by month
          </h2>
        </div>
        <p className="section__intro">
          In {MONTHS[m]}, start with{" "}
          {nowList.slice(0, 3).map((h, i, a) => (
            <span key={h.name}>
              <strong>{h.name.toLowerCase()}</strong>
              {i < a.length - 2 ? ", " : i === a.length - 2 ? " and " : ""}
            </span>
          ))}
          . Scuds and sowbugs are on the menu every day of the year on this river.
        </p>
      </Reveal>

      <Reveal id="hatch-chart" className="panel">
        <div className="hatch-wrap">
          <table className="hatch">
            <caption className="sr-only">Hatch and spawning-run calendar for the Miracle Mile</caption>
            <thead>
              <tr>
                <th />
                {MONTHS.map((mo, i) => (
                  <th key={mo} className={i === m ? "is-now" : ""} scope="col">
                    {mo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HATCHES.map((h) => (
                <tr key={h.name} className={h.kind === "run" ? "is-run" : ""}>
                  <th scope="row">
                    {h.name}
                    <small>{h.flies}</small>
                  </th>
                  {h.months.map((v, i) => (
                    <td key={i} className={i === m ? "is-now" : ""}>
                      <div className="cell" data-i={v} title={`${h.name}, ${MONTHS[i]}: ${LEVEL[v]}`}>
                        <span className="sr-only">{LEVEL[v]}</span>
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="small muted" style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 14 }}>
          {[1, 2, 3].map((i) => (
            <span key={i} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
              <i className="cell" data-i={i} style={{ width: 16, height: 10, display: "inline-block", borderRadius: 2, background: i === 3 ? "var(--river)" : `color-mix(in srgb, var(--river) ${i === 1 ? 30 : 62}%, var(--card))` }} />
              {LEVEL[i]}
            </span>
          ))}
          <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
            <i style={{ width: 16, height: 10, display: "inline-block", borderRadius: 2, background: "var(--rust)" }} />
            spawning run up from Pathfinder
          </span>
        </div>
        <p className="small muted" style={{ margin: "12px 0 0" }}>
          A general guide — timing shifts with flows and water temperature. Check current Wyoming Game &amp; Fish regulations before you go.
        </p>
      </Reveal>
    </section>
  );
}
