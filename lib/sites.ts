import { REGION_GEO } from "./regionGeo";

export type SiteKind = "dam" | "gauge";

export interface SiteDef {
  id: string;
  kind: SiteKind;
  name: string;
  short: string;
  lat: number;
  lon: number;
  blurb: string;
  /** USBR Hydromet station code (dams) */
  usbr?: string;
  /** which Hydromet parameters this dam reports */
  params?: ("QD" | "IN" | "AF" | "FB")[];
  /** reservoir key in REGION_GEO.reservoirs */
  reservoir?: keyof typeof REGION_GEO.reservoirs;
  /** approximate total capacity, acre-feet (for % full) */
  capacityAf?: number;
  /** USGS site number (gauges) */
  usgs?: string;
  /** which side of the marker its map label sits on (default right) */
  labelSide?: "left" | "right";
}

const dam = REGION_GEO.dams;

/** Upstream → downstream along the North Platte. */
export const SITES: SiteDef[] = [
  {
    id: "usgs-06630000",
    kind: "gauge",
    name: "North Platte above Seminoe",
    short: "N. Platte inflow",
    lat: 41.8722,
    lon: -107.0576,
    usgs: "06630000",
    blurb: "The main river coming into Seminoe Reservoir. Watch it climb in spring runoff.",
  },
  {
    id: "usgs-06635000",
    kind: "gauge",
    name: "Medicine Bow above Seminoe",
    short: "Medicine Bow",
    lat: 42.0097,
    lon: -106.5131,
    usgs: "06635000",
    blurb: "The Medicine Bow River, the other main feeder of Seminoe.",
  },
  {
    id: "seminoe",
    kind: "dam",
    name: "Seminoe Dam",
    short: "Seminoe",
    ...dam.seminoe,
    labelSide: "left",
    usbr: "SEMR",
    params: ["QD", "IN", "AF", "FB"],
    reservoir: "seminoe",
    capacityAf: 1_017_273,
    blurb: "The big storage reservoir upstream. Its release passes through Kortes into the Mile.",
  },
  {
    id: "kortes",
    kind: "dam",
    name: "Kortes Dam",
    short: "Kortes",
    ...dam.kortes,
    usbr: "KORR",
    params: ["QD"],
    reservoir: "kortes",
    blurb: "A small run-of-river dam. Its release is the flow through the Miracle Mile.",
  },
  {
    id: "usgs-06639000",
    kind: "gauge",
    name: "Sweetwater near Alcova",
    short: "Sweetwater",
    lat: 42.49,
    lon: -107.1412,
    usgs: "06639000",
    blurb: "The Sweetwater River entering Pathfinder from the west. Seasonal gauge.",
  },
  {
    id: "pathfinder",
    kind: "dam",
    name: "Pathfinder Dam",
    short: "Pathfinder",
    ...dam.pathfinder,
    usbr: "PATR",
    params: ["QD", "IN", "AF", "FB"],
    reservoir: "pathfinder",
    capacityAf: 1_016_507,
    blurb: "The reservoir the Mile drains into, and where its spawning trout come from.",
  },
  {
    id: "alcova",
    kind: "dam",
    name: "Alcova Dam",
    short: "Alcova",
    ...dam.alcova,
    usbr: "ALCR",
    params: ["QD", "IN", "AF", "FB"],
    reservoir: "alcova",
    blurb: "Below Pathfinder and Fremont Canyon. Its release flows on downstream to Gray Reef.",
  },
  {
    id: "usgs-06642000",
    kind: "gauge",
    name: "North Platte at Alcova",
    short: "At Alcova",
    labelSide: "left",
    lat: 42.5741,
    lon: -106.6926,
    usgs: "06642000",
    blurb: "North Platte below Alcova Dam. Seasonal gauge.",
  },
];

export const PARAM_LABEL = {
  QD: "Release",
  IN: "Inflow",
  AF: "Storage",
  FB: "Elevation",
} as const;
