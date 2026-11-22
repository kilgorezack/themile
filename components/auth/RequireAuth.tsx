"use client";

import { useAuth } from "./AuthProvider";

/**
 * Shows children only to signed-in users; everyone else gets a sign-in prompt.
 * Client-side gate: fine for the public data these pages show today. Anything
 * private later should also be enforced server-side (Firebase Admin token check
 * or Firestore Security Rules).
 */
export function RequireAuth({ feature, blurb, children }: { feature: string; blurb: string; children: React.ReactNode }) {
  const { user, loading, openSignIn } = useAuth();

  if (loading)
    return (
      <div className="gate wrap" aria-busy="true">
        <div className="gate__card gate__card--loading" />
      </div>
    );

  if (!user)
    return (
      <div className="gate wrap">
        <div className="gate__card">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--river)" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
          <div className="label">Members</div>
          <h1>{feature}</h1>
          <p className="muted">{blurb}</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            <button type="button" className="btn btn--solid" onClick={openSignIn}>
              Sign in or create an account
            </button>
            <a className="btn" href="/" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
              Back to conditions
            </a>
          </div>
          <p className="small muted" style={{ margin: 0 }}>
            Free. Google or email.
          </p>
        </div>
      </div>
    );

  return <>{children}</>;
}
