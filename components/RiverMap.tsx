"use client";

import { MILE_GEO as G } from "@/lib/mileGeo";

/**
 * Real geography: USGS NHD reservoir shorelines (full pool) and NLDI river
 * flowlines, projected to a flat map. North is up.
 */
export function RiverMap({ flow }: { flow: number | null }) {
  const speed = flow ? Math.max(0.5, 3.2 - Math.log10(flow)) : 2;
  const [kx, ky] = G.kortesDam;
  const [ix, iy] = G.inlet;
  const [mx, my] = G.mileMid;
  const [LAT0, LAT1, LON0, LON1] = G.bounds;
  const px = (lon: number) => ((lon - LON0) / (LON1 - LON0)) * G.w;
  const py = (lat: number) => ((LAT1 - lat) / (LAT1 - LAT0)) * G.h;
  const lats = [42.15, 42.2, 42.25];
  const lons = [-106.95, -106.9, -106.85, -106.8];
  // 1 mile in px: frame is 0.2° of longitude at ~42.2°N ≈ 10.25 mi across.
  const pxPerMile = G.w / 10.25;

  return (
    <div className="map">
      <svg viewBox={`0 0 ${G.w} ${G.h}`} role="img" aria-label="Map of the Miracle Mile: the North Platte River from Kortes Dam north to Pathfinder Reservoir">
        <defs>
          <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--slate)" strokeWidth="0.6" opacity="0.35" />
          </pattern>
          <clipPath id="frame">
            <rect width={G.w} height={G.h} rx="4" />
          </clipPath>
        </defs>

        <g clipPath="url(#frame)">
          {/* graticule */}
          <g stroke="var(--rule)" strokeWidth="0.8" strokeDasharray="2 4">
            {lats.map((la) => (
              <line key={la} x1="0" x2={G.w} y1={py(la)} y2={py(la)} />
            ))}
            {lons.map((lo) => (
              <line key={lo} y1="0" y2={G.h} x1={px(lo)} x2={px(lo)} />
            ))}
          </g>
          <g fontFamily="var(--font-mono)" fontSize="8.5" fill="var(--ink-3)">
            {lats.map((la) => (
              <text key={la} x={G.w - 4} y={py(la) - 3} textAnchor="end">
                {la.toFixed(2)}°N
              </text>
            ))}
            {lons.slice(0, -1).map((lo) => (
              <text key={lo} x={px(lo) + 3} y={11}>
                {Math.abs(lo).toFixed(2)}°W
              </text>
            ))}
          </g>

          {/* the river everywhere it's drawn (upstream canyon, through the reservoirs) */}
          <path d={G.river} fill="none" stroke="var(--slate)" strokeWidth="1.4" opacity="0.6" strokeLinejoin="round" />

          {/* reservoirs */}
          {[G.seminoe, G.pathfinder, G.kortes].map((d, i) => (
            <g key={i}>
              <path d={d} fill="color-mix(in srgb, var(--slate) 22%, var(--card))" fillRule="evenodd" />
              <path d={d} fill="url(#hatch)" fillRule="evenodd" />
              <path d={d} fill="none" stroke="var(--slate)" strokeWidth="1" strokeLinejoin="round" />
            </g>
          ))}

          {/* the Mile */}
          <path d={G.mile} fill="none" stroke="var(--river)" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" opacity="0.25" />
          <path d={G.mile} fill="none" stroke="var(--river)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path
            className="flowline"
            d={G.mile}
            fill="none"
            stroke="var(--card)"
            strokeWidth="1.6"
            strokeLinecap="round"
            style={{ animationDuration: `${speed}s` }}
          />

          {/* Kortes Dam */}
          <g transform={`translate(${kx} ${ky})`}>
            <rect x="-9" y="-3" width="18" height="6" rx="1.5" fill="var(--ink)" transform="rotate(-20)" />
          </g>
          <MapLabel x={kx + 14} y={ky + 16} text="KORTES DAM" />
          <MapLabel x={kx + 8} y={ky + 112} text="SEMINOE RES." />
          <MapLabel x={ix + 18} y={iy - 26} text="PATHFINDER RES." />

          {/* inlet marker */}
          <circle cx={ix} cy={iy} r="4" fill="var(--card)" stroke="var(--river)" strokeWidth="2" />
        </g>

        {/* name + flow, set off to the east with a leader */}
        <line x1={mx + 8} y1={my} x2={mx + 34} y2={my} stroke="var(--ink-3)" strokeWidth="1" />
        <text x={mx + 40} y={my - 6} fontFamily="var(--font-display)" fontStyle="italic" fontSize="22" fill="var(--ink)" stroke="var(--card)" strokeWidth="4" paintOrder="stroke">
          Miracle Mile
        </text>
        <text x={mx + 40} y={my + 10} fontFamily="var(--font-mono)" fontSize="9.5" letterSpacing="1" fill="var(--ink-2)">
          NORTH PLATTE RIVER
        </text>
        {flow != null && (
          <g transform={`translate(${mx + 40} ${my + 20})`}>
            <rect width="80" height="24" rx="4" fill="var(--ink)" />
            <text x="40" y="16" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="12" fill="var(--paper)">
              {Math.round(flow)} cfs
            </text>
          </g>
        )}

        {/* north arrow + scale */}
        <g transform="translate(22 26)" stroke="var(--ink-2)" fill="none">
          <path d="M0 16 L0 -8 M-5 -1 L0 -9 L5 -1" strokeWidth="1.4" />
          <text x="-3.5" y="30" fontFamily="var(--font-mono)" fontSize="10" fill="var(--ink-2)" stroke="none">
            N
          </text>
        </g>
        <g transform={`translate(16 ${G.h - 18})`}>
          <rect x="-6" y="-14" width={pxPerMile + 46} height="26" rx="3" fill="var(--card)" opacity="0.85" />
          <line x1="0" x2={pxPerMile} y1="0" y2="0" stroke="var(--ink-2)" strokeWidth="1.5" />
          <line x1="0" x2="0" y1="-4" y2="4" stroke="var(--ink-2)" strokeWidth="1.5" />
          <line x1={pxPerMile} x2={pxPerMile} y1="-4" y2="4" stroke="var(--ink-2)" strokeWidth="1.5" />
          <text x={pxPerMile + 6} y="4" fontFamily="var(--font-mono)" fontSize="10" fill="var(--ink-2)">
            1 mi
          </text>
        </g>
      </svg>
      <p className="small muted" style={{ margin: "6px 0 0" }}>
        Shorelines shown at full pool. Seminoe and Kortes dams regulate the flow; trout run up out of Pathfinder to spawn each spring
        and fall.
      </p>
    </div>
  );
}

function MapLabel({ x, y, text }: { x: number; y: number; text: string }) {
  return (
    <text
      x={x}
      y={y}
      fontFamily="var(--font-mono)"
      fontSize="10"
      letterSpacing="1"
      fill="var(--ink-2)"
      stroke="var(--card)"
      strokeWidth="3"
      paintOrder="stroke"
    >
      {text}
    </text>
  );
}
