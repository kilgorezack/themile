"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthProvider";

/** Top-right: "Sign in" when signed out, an avatar + menu when signed in. */
export function AccountButton() {
  const { user, loading, openSignIn, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (loading) return <span className="acct acct--placeholder" aria-hidden />;

  if (!user)
    return (
      <button type="button" className="acct__signin" onClick={openSignIn}>
        Sign in
      </button>
    );

  const label = user.displayName || user.email || "Account";
  const initials = label
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

  return (
    <div className="acct" ref={wrap}>
      <button type="button" className="acct__avatar" aria-haspopup="menu" aria-expanded={open} aria-label={`Account: ${label}`} onClick={() => setOpen((o) => !o)}>
        {user.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.photoURL} alt="" referrerPolicy="no-referrer" width={32} height={32} />
        ) : (
          <span>{initials}</span>
        )}
      </button>
      {open && (
        <div className="acct__menu" role="menu">
          <div className="acct__who">
            {user.displayName && <strong>{user.displayName}</strong>}
            <span className="muted small">{user.email}</span>
          </div>
          <a role="menuitem" href="/dashboard">
            Dashboard
          </a>
          <a role="menuitem" href="/map">
            Map
          </a>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              signOut();
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
