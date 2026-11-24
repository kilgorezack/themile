"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthProvider";
import {
  ALERTS,
  EXPERIENCE,
  FREQUENCY,
  METHODS,
  STYLES,
  fullName,
  saveProfile,
  uploadAvatar,
  type Profile,
} from "@/lib/profile";

/**
 * Edit profile: the same fields as Account in the Milecast iOS app, read from
 * and saved to the same Firestore document, so a change on either side shows
 * up on the other.
 */
export function ProfileDialog() {
  const { user, profile, profileOpen, closeProfile, userChanged } = useAuth();
  const ref = useRef<HTMLDialogElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<Profile | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  // Open/close the native dialog.
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (profileOpen && !d.open) {
      setError("");
      setDirty(false);
      setDraft(profile);
      d.showModal();
    } else if (!profileOpen && d.open) d.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileOpen]);

  // Until the person starts editing, follow live changes (e.g. saved from the app a moment ago).
  useEffect(() => {
    if (profileOpen && !dirty) setDraft(profile);
  }, [profile, profileOpen, dirty]);

  const edit = (fn: (p: Profile) => Profile) => {
    setDirty(true);
    setDraft((p) => (p ? fn(p) : p));
  };
  const toggleIn = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // so picking the same file again still fires
    if (!file || !user || !profile) return;
    setUploading(true);
    setError("");
    try {
      const url = await uploadAvatar(user, file);
      // Save the photo straight away, as the app does; other edits stay in the form until Save.
      await saveProfile(user, { ...profile, photoURL: url });
      setDraft((p) => (p ? { ...p, photoURL: url } : p));
      userChanged();
    } catch (err) {
      setError((err as Error)?.message || "That photo couldn't be uploaded. Try again.");
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !draft) return;
    setBusy(true);
    setError("");
    try {
      await saveProfile(user, draft);
      userChanged();
      closeProfile();
    } catch {
      setError("Your changes didn't save. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const p = draft;
  const name = p ? fullName(p) : "";
  const initials = p ? [p.firstName[0], p.lastName[0]].filter(Boolean).join("").toUpperCase() || "?" : "";

  return (
    <dialog ref={ref} className="authd profd" onClose={closeProfile} onCancel={closeProfile} aria-labelledby="profd-title">
      <div className="authd__inner">
        <button type="button" className="authd__close" aria-label="Close" onClick={closeProfile}>
          ×
        </button>
        <h2 id="profd-title">Edit profile</h2>

        {!p ? (
          <p className="muted small">{user ? "Loading your profile…" : "Sign in to edit your profile."}</p>
        ) : (
          <form onSubmit={submit} className="authd__form profd__form">
            <div className="profd__who">
              <button
                type="button"
                className="profd__photo"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                aria-label="Change profile photo"
              >
                {p.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.photoURL} alt="" referrerPolicy="no-referrer" />
                ) : (
                  <span>{initials}</span>
                )}
                <em aria-hidden>{uploading ? "…" : "Edit"}</em>
              </button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPhoto} />
              <div>
                <strong>{name || "Your name"}</strong>
                <span className="muted small">{user?.email}</span>
              </div>
            </div>

            <fieldset>
              <legend>Name</legend>
              <div className="profd__row">
                <label>
                  <span>First name</span>
                  <input
                    type="text"
                    required
                    maxLength={60}
                    autoComplete="given-name"
                    value={p.firstName}
                    onChange={(e) => edit((x) => ({ ...x, firstName: e.target.value }))}
                  />
                </label>
                <label>
                  <span>Last name</span>
                  <input
                    type="text"
                    maxLength={60}
                    autoComplete="family-name"
                    value={p.lastName}
                    onChange={(e) => edit((x) => ({ ...x, lastName: e.target.value }))}
                  />
                </label>
              </div>
            </fieldset>

            <fieldset>
              <legend>How you fish</legend>
              <span className="profd__label">Mostly fishing with</span>
              <div className="profd__chips">
                {METHODS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    aria-pressed={p.fishing.methods.includes(m.id)}
                    onClick={() => edit((x) => ({ ...x, fishing: { ...x.fishing, methods: toggleIn(x.fishing.methods, m.id) } }))}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <span className="profd__label">On the water by</span>
              <div className="profd__chips">
                {STYLES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={p.fishing.styles.includes(s.id)}
                    onClick={() => edit((x) => ({ ...x, fishing: { ...x.fishing, styles: toggleIn(x.fishing.styles, s.id) } }))}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <div className="profd__row">
                <label>
                  <span>Fishing for</span>
                  <select
                    value={p.fishing.experience ?? ""}
                    onChange={(e) =>
                      edit((x) => ({ ...x, fishing: { ...x.fishing, experience: (e.target.value || undefined) as Profile["fishing"]["experience"] } }))
                    }
                  >
                    <option value="">Not set</option>
                    {EXPERIENCE.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>On the Mile</span>
                  <select
                    value={p.fishing.frequency ?? ""}
                    onChange={(e) =>
                      edit((x) => ({ ...x, fishing: { ...x.fishing, frequency: (e.target.value || undefined) as Profile["fishing"]["frequency"] } }))
                    }
                  >
                    <option value="">Not set</option>
                    {FREQUENCY.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="profd__switch">
                <span>Guide or outfitter</span>
                <input
                  type="checkbox"
                  role="switch"
                  checked={p.fishing.isGuide}
                  onChange={(e) => edit((x) => ({ ...x, fishing: { ...x.fishing, isGuide: e.target.checked } }))}
                />
              </label>
            </fieldset>

            <fieldset>
              <legend>Notifications</legend>
              {ALERTS.map((a) => (
                <label key={a.id} className="profd__switch">
                  <span>{a.label}</span>
                  <input
                    type="checkbox"
                    role="switch"
                    checked={p.alerts[a.id]}
                    onChange={(e) => edit((x) => ({ ...x, alerts: { ...x.alerts, [a.id]: e.target.checked } }))}
                  />
                </label>
              ))}
            </fieldset>

            <fieldset>
              <legend>Plan</legend>
              <div className="profd__plan">
                {p.plan === "one" ? (
                  <>
                    <span>Milecast One</span>
                    <strong className="profd__active">Active</strong>
                  </>
                ) : (
                  <>
                    <span>Free</span>
                    <a href="/pricing">See Milecast One</a>
                  </>
                )}
              </div>
            </fieldset>

            {error && (
              <p className="authd__error" role="alert">
                {error}
              </p>
            )}

            <div className="profd__actions">
              <button type="button" className="btn" onClick={closeProfile}>
                Cancel
              </button>
              <button type="submit" className="btn btn--solid" disabled={busy || uploading || !p.firstName.trim()}>
                {busy ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        )}
      </div>
    </dialog>
  );
}
