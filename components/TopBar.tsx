"use client";

import { useEffect, useState } from "react";
import { AccountButton } from "./auth/AccountButton";
import { useAuth } from "./auth/AuthProvider";

const TABS = [
  { id: "home", href: "/", label: "Home", members: false },
  { id: "conditions", href: "/conditions", label: "Conditions", members: true },
  { id: "dashboard", href: "/dashboard", label: "Dashboard", members: true },
  { id: "map", href: "/map", label: "Map", members: true },
] as const;

export type TabId = (typeof TABS)[number]["id"];

/**
 * Site header. On the home page it floats transparent over the hero and turns
 * solid on scroll; on other pages it's solid from the start.
 */
export function TopBar({
  variant = "solid",
  solidAfter,
  active,
  stale = false,
  observedAt,
  now,
}: {
  variant?: "hero" | "solid";
  /** hero variant: px scrolled before the bar turns solid (default 60% of the viewport) */
  solidAfter?: number;
  active: TabId | null;
  stale?: boolean;
  observedAt?: string | null;
  now: number;
}) {
  const [solid, setSolid] = useState(variant === "solid");
  const { user, loading } = useAuth();
  const locked = !loading && !user;
  useEffect(() => {
    if (variant === "solid") {
      setSolid(true);
      return;
    }
    const on = () => setSolid(window.scrollY > (solidAfter ?? window.innerHeight * 0.6));
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, [variant, solidAfter]);
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
              {t.members && locked && (
                <svg className="tabs__lock" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-label="requires an account">
                  <rect x="5" y="11" width="14" height="10" rx="2" />
                  <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                </svg>
              )}
            </a>
          ))}
        </nav>
        <a href="/pricing" className="topbar__pricing">
          Pricing
        </a>
        <AccountButton />
      </div>
    </div>
  );
}
