import type { CurrentObs, HourlyForecast } from "./types";
import { flowBand } from "./config";

export type Tone = "good" | "fair" | "tough" | "rough";

export interface Verdict {
  tone: Tone;
  headline: string;
  notes: string[];
}

const HEADLINES: Record<Tone, string> = {
  good: "Worth the drive",
  fair: "Fishable — pick your windows",
  tough: "Tough day out there",
  rough: "Tie flies at home",
};

/**
 * A plain-language read on the day, the way a guide would give it at the
 * fly shop counter. Deliberately simple and explainable — no hidden score.
 */
export function readTheDay(
  current: CurrentObs | null,
  flowCfs: number | null,
  hourly: HourlyForecast[],
  solunarActive: boolean,
): Verdict {
  let points = 0;
  const notes: string[] = [];

  // Wind is the deciding factor on the Mile more days than not.
  const next8 = hourly.filter((h) => h.t > Date.now() && h.t < Date.now() + 8 * 3600_000);
  const peakWind = Math.max(current?.gustMph ?? current?.windMph ?? 0, ...next8.map((h) => h.gustMph ?? h.windMph ?? 0));
  if (peakWind < 12) {
    points += 2;
    notes.push("Light wind — a rare gift on the Mile. Fish dries if anything is coming up.");
  } else if (peakWind < 22) {
    points += 1;
    notes.push(`Breezy, gusts near ${Math.round(peakWind)} mph. Shorten up and fish nymphs under an indicator.`);
  } else if (peakWind < 35) {
    points -= 1;
    notes.push(`Gusts to ${Math.round(peakWind)} mph. Put the wind at your back and plan on heavy rigs.`);
  } else {
    points -= 3;
    notes.push(`Gusts pushing ${Math.round(peakWind)} mph. Casting will be a fight — watch footing.`);
  }

  const band = flowBand(flowCfs);
  if (band) {
    if (band.index <= 1) points += 2;
    else if (band.index === 2) points += 1;
    else points -= band.index - 2;
    notes.push(`${Math.round(flowCfs!)} cfs out of Kortes — ${band.label.toLowerCase()}. ${band.note}`);
  }

  if (current?.pressureTrend === "falling") {
    points += 1;
    notes.push("Barometer falling — fish often feed hard ahead of a front.");
  } else if (current?.pressureTrend === "rising") {
    notes.push("Barometer rising behind a front — expect a slower, deeper bite.");
  }

  const t = current?.tempF;
  if (t != null) {
    if (t < 15) {
      points -= 2;
      notes.push(`${Math.round(t)}°F — iced guides all day. Midday is your window.`);
    } else if (t < 32) {
      notes.push("Below freezing — fish the warmest part of the afternoon.");
    } else if (t > 88) {
      points -= 1;
      notes.push("Hot afternoon. Mornings and evenings will fish better.");
    }
  }

  if (solunarActive) {
    points += 1;
    notes.push("You're inside a solunar feeding window right now.");
  }

  const tone: Tone = points >= 4 ? "good" : points >= 1 ? "fair" : points >= -2 ? "tough" : "rough";
  return { tone, headline: HEADLINES[tone], notes };
}
