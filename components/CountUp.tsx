"use client";

import { useEffect, useRef, useState } from "react";

/** Eases a number from its previous value to the new one. Renders "—" for null. */
export function CountUp({ value, digits = 0, duration = 1200 }: { value: number | null; digits?: number; duration?: number }) {
  const [shown, setShown] = useState<number | null>(value);
  const from = useRef<number | null>(null);

  useEffect(() => {
    if (value == null) {
      setShown(null);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(value);
      from.current = value;
      return;
    }
    // First paint counts up from a little below; later updates glide from the last value.
    const start = from.current ?? value * 0.6;
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const e = 1 - Math.pow(1 - p, 4);
      setShown(start + (value - start) * e);
      if (p < 1) raf = requestAnimationFrame(step);
      else from.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  if (shown == null) return <>—</>;
  return <>{shown.toFixed(digits)}</>;
}
