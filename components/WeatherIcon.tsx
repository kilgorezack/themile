import type { IconKey } from "@/lib/weather/icons";

/** Hand-drawn-ish line icons. Stroke inherits currentColor. */
export function WeatherIcon({ icon, size = 28 }: { icon: string; size?: number }) {
  const k = icon as IconKey;
  const sun = (cx = 16, cy = 16, r = 5) => (
    <g>
      <circle cx={cx} cy={cy} r={r} />
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4;
        return (
          <line
            key={i}
            x1={cx + Math.cos(a) * (r + 3)}
            y1={cy + Math.sin(a) * (r + 3)}
            x2={cx + Math.cos(a) * (r + 6)}
            y2={cy + Math.sin(a) * (r + 6)}
          />
        );
      })}
    </g>
  );
  const moon = <path d="M20 8a8 8 0 1 0 5 13A7 7 0 0 1 20 8z" />;
  const cloud = <path d="M9 24h14a5 5 0 0 0 0-10 7 7 0 0 0-13.5 1.5A4.3 4.3 0 0 0 9 24z" />;

  let body: React.ReactNode;
  switch (k) {
    case "clear-day":
      body = sun();
      break;
    case "clear-night":
      body = moon;
      break;
    case "partly-day":
      body = (
        <>
          <g transform="translate(-4 -5) scale(.8)">{sun()}</g>
          <path d="M11 26h13a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.5 1.3A3.9 3.9 0 0 0 11 26z" fill="var(--card, #fff)" />
        </>
      );
      break;
    case "partly-night":
      body = (
        <>
          <g transform="translate(-5 -5) scale(.8)">{moon}</g>
          <path d="M11 26h13a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.5 1.3A3.9 3.9 0 0 0 11 26z" fill="var(--card, #fff)" />
        </>
      );
      break;
    case "cloudy":
      body = cloud;
      break;
    case "fog":
      body = (
        <>
          <path d="M9 18h14a5 5 0 0 0 0-10 7 7 0 0 0-13.5 1.5" />
          <line x1="6" y1="22" x2="26" y2="22" />
          <line x1="9" y1="27" x2="23" y2="27" />
        </>
      );
      break;
    case "rain":
      body = (
        <>
          <g transform="translate(0 -4)">{cloud}</g>
          <line x1="11" y1="24" x2="9" y2="29" />
          <line x1="17" y1="24" x2="15" y2="29" />
          <line x1="23" y1="24" x2="21" y2="29" />
        </>
      );
      break;
    case "snow":
    case "sleet":
      body = (
        <>
          <g transform="translate(0 -4)">{cloud}</g>
          {[10, 16, 22].map((x) => (
            <g key={x}>
              <line x1={x - 1.6} y1={26} x2={x + 1.6} y2={28} />
              <line x1={x + 1.6} y1={26} x2={x - 1.6} y2={28} />
            </g>
          ))}
        </>
      );
      break;
    case "storm":
      body = (
        <>
          <g transform="translate(0 -4)">{cloud}</g>
          <path d="M17 21l-3 5h4l-2 5" />
        </>
      );
      break;
    case "wind":
      body = (
        <>
          <path d="M4 12h15a3.5 3.5 0 1 0-3.5-3.5" />
          <path d="M4 18h21a3.5 3.5 0 1 1-3.5 3.5" />
          <path d="M4 24h10" />
        </>
      );
      break;
    default:
      body = sun();
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {body}
    </svg>
  );
}
