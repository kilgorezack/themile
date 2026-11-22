/**
 * General hatch & food calendar for the Miracle Mile. Intensity per month,
 * Jan → Dec: 0 none, 1 present, 2 good, 3 peak. Tailwater bugs vary year to
 * year with flows and water temperature; treat this as a starting point.
 */
export interface Hatch {
  name: string;
  kind: "bug" | "run";
  flies: string;
  months: [number, number, number, number, number, number, number, number, number, number, number, number];
}

export const HATCHES: Hatch[] = [
  { name: "Midges", kind: "bug", flies: "Zebra midge, black beauty, Griffith's gnat", months: [3, 3, 3, 3, 2, 1, 1, 1, 1, 2, 3, 3] },
  { name: "Scuds & sowbugs", kind: "bug", flies: "Orange/tan scud, ray charles, pink sowbug", months: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3] },
  { name: "Blue-winged olives", kind: "bug", flies: "Pheasant tail, RS2, parachute BWO", months: [0, 0, 2, 3, 2, 0, 0, 0, 2, 3, 2, 0] },
  { name: "Pale morning duns", kind: "bug", flies: "PMD nymph, sparkle dun", months: [0, 0, 0, 0, 0, 2, 3, 2, 1, 0, 0, 0] },
  { name: "Caddis", kind: "bug", flies: "Bead-head caddis pupa, elk hair caddis", months: [0, 0, 0, 0, 1, 2, 3, 3, 2, 0, 0, 0] },
  { name: "Yellow sallies", kind: "bug", flies: "Yellow stimulator, sally nymph", months: [0, 0, 0, 0, 0, 2, 2, 1, 0, 0, 0, 0] },
  { name: "Tricos", kind: "bug", flies: "Trico spinner, small black parachute", months: [0, 0, 0, 0, 0, 0, 1, 3, 2, 0, 0, 0] },
  { name: "Crane flies", kind: "bug", flies: "Crane fly larva, tan worm", months: [0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0] },
  { name: "Hoppers & terrestrials", kind: "bug", flies: "Foam hopper, ant, beetle", months: [0, 0, 0, 0, 0, 0, 2, 3, 2, 0, 0, 0] },
  { name: "Leeches & streamers", kind: "bug", flies: "Balanced leech, sculpin, bunny streamer", months: [2, 2, 2, 2, 2, 1, 1, 1, 2, 3, 3, 2] },
  { name: "Spring rainbow run", kind: "run", flies: "Eggs, worms, small nymphs", months: [0, 1, 3, 3, 2, 0, 0, 0, 0, 0, 0, 0] },
  { name: "Fall brown run", kind: "run", flies: "Eggs, leeches, streamers", months: [0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 3, 1] },
];

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
