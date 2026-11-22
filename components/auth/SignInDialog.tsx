"use client";

import { useEffect, useRef, useState } from "react";
import { authErrorMessage, useAuth } from "./AuthProvider";

type Mode = "signin" | "create" | "reset";

export function SignInDialog() {
  const { dialogOpen, closeSignIn, signInWithGoogle, signInWithApple, signInWithEmail, createAccount, resetPassword } = useAuth();
  const ref = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (dialogOpen && !d.open) {
      setError("");
      setNotice("");
      setPassword("");
      d.showModal();
    } else if (!dialogOpen && d.open) d.close();
  }, [dialogOpen]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "reset")
      run(async () => {
        await resetPassword(email);
        setNotice("If there's an account for that email, a reset link is on its way.");
      });
    else if (mode === "create") run(() => createAccount(email, password, name));
    else run(() => signInWithEmail(email, password));
  };

  const title = mode === "create" ? "Create your account" : mode === "reset" ? "Reset your password" : "Sign in to The Mile";

  return (
    <dialog ref={ref} className="authd" onClose={closeSignIn} onCancel={closeSignIn} aria-labelledby="authd-title">
      <div className="authd__inner">
        <button type="button" className="authd__close" aria-label="Close" onClick={closeSignIn}>
          ×
        </button>
        <h2 id="authd-title">{title}</h2>
        <p className="muted small">
          {mode === "reset"
            ? "We'll email you a link to choose a new password."
            : "An account unlocks the Dashboard and Map, and keeps your layout across devices."}
        </p>

        {mode !== "reset" && (
          <>
            <button type="button" className="authd__google" disabled={busy} onClick={() => run(signInWithGoogle)}>
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
              </svg>
              Continue with Google
            </button>
            <button type="button" className="authd__apple" disabled={busy} onClick={() => run(signInWithApple)}>
              <svg width="16" height="19" viewBox="0 0 814 1000" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M788 341c-6 4-108 62-108 190 0 148 130 200 134 202-1 3-21 71-69 141-43 61-87 122-156 122s-87-40-166-40c-77 0-104 41-167 41s-107-57-158-127C40 787 0 678 0 574c0-167 109-256 216-256 57 0 105 37 141 37 34 0 87-39 152-39 25 0 113 2 171 85zM548 157c27-32 46-76 46-120 0-6-1-12-2-17-44 2-96 29-127 65-25 28-48 72-48 117 0 7 1 13 2 16 3 0 7 1 12 1 39 0 89-27 117-62z"
                />
              </svg>
              Continue with Apple
            </button>
            <div className="authd__or">
              <span>or with email</span>
            </div>
          </>
        )}

        <form onSubmit={submit} className="authd__form">
          {mode === "create" && (
            <label>
              <span>Name</span>
              <input type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
          )}
          <label>
            <span>Email</span>
            <input type="email" required autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          {mode !== "reset" && (
            <label>
              <span>Password</span>
              <input
                type="password"
                required
                minLength={6}
                autoComplete={mode === "create" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
          )}

          {error && (
            <p className="authd__error" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="authd__notice" role="status">
              {notice}
            </p>
          )}

          <button type="submit" className="btn btn--solid authd__submit" disabled={busy}>
            {busy ? "One moment…" : mode === "create" ? "Create account" : mode === "reset" ? "Send reset link" : "Sign in"}
          </button>
        </form>

        <div className="authd__links small">
          {mode === "signin" && (
            <>
              <button type="button" onClick={() => setMode("reset")}>
                Forgot password?
              </button>
              <button type="button" onClick={() => setMode("create")}>
                Create an account
              </button>
            </>
          )}
          {mode !== "signin" && (
            <button type="button" onClick={() => setMode("signin")}>
              ← Back to sign in
            </button>
          )}
        </div>
      </div>
    </dialog>
  );
}
