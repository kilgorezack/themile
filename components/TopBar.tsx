"use client";

import { useEffect, useState } from "react";

const TABS = [
  { id: "home", href: "/", label: "Conditions" },
  { id: "dashboard", href: "/dashboard", label: "Dashboard" },
  { id: "map", href: "/map", label: "Map" },
] as const;

export type TabId = (typeof TABS)[number]["id"];

/**
 * Site header. On the home page it floats transparent over the hero and turns
 * solid on scroll; on other pages it's solid from the start.
 */
export function TopBar({
  variant = "solid",
  active,
  stale = false,
  observedAt,
  now,
}: {
  variant?: "hero" | "solid";
  active: TabId;
  stale?: boolean;
  observedAt?: string | null;
  now: number;
}) {
  const [solid, setSolid] = useState(variant === "solid");
  useEffect(() => {
    if (variant === "solid") return;
    const on = () => setSolid(window.scrollY > window.innerHeight * 0.6);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, [variant]);
  const mins = observedAt ? Math.round((now - Date.parse(observedAt)) / 60_000) : null;
  const old = stale || mins == null || mins > 20;
  return (
    <div className={`topbar ${solid ? "is-solid" : ""}`} id="top">
      <div className="wrap topbar__inner">
        <a href="/" className="wordmark">
          The Mile <small>Miracle Mile, WY</small>
        </a>
        <nav aria-label="Pages" className="tabs">
          {TABS.map((t) => (
            <a key={t.id} href={t.href} className={t.id === active ? "is-active" : ""} aria-current={t.id === active ? "page" : undefined}>
              {t.label}
            </a>
          ))}
        </nav>
        {observedAt !== undefined && (
          <span className="live" title={observedAt ?? undefined}>
            <span className={`live__dot ${old ? "is-stale" : ""}`} />
            <span className="live__text">{mins == null ? "no station" : mins < 2 ? "live" : `${mins}m ago`}</span>
          </span>
        )}
      </div>
    </div>
  );
}
