"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  OAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut as fbSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { firebaseApp } from "@/lib/firebase";
import { watchProfile, type Profile } from "@/lib/profile";

interface AuthState {
  user: User | null;
  /** true until Firebase has told us whether someone is signed in */
  loading: boolean;
  /** the shared app/website profile (Firestore users/{uid}), live; null until loaded or when signed out */
  profile: Profile | null;
  /** the Edit profile dialog */
  profileOpen: boolean;
  openProfile: () => void;
  closeProfile: () => void;
  /** call after changing the Firebase Auth name/photo in place */
  userChanged: () => void;
  /** the sign-in dialog, shared so any page can open it */
  dialogOpen: boolean;
  openSignIn: () => void;
  closeSignIn: () => void;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  createAccount: (email: string, password: string, name?: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rev, setRev] = useState(0); // bumps when the profile changes in place
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const auth = getAuth(firebaseApp());
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (u) setDialogOpen(false);
    });
  }, []);

  // Follow the profile document live, so changes saved in the iOS app show up here without a reload.
  const uid = user?.uid;
  useEffect(() => {
    setProfile(null);
    if (!user) {
      setProfileOpen(false);
      return;
    }
    let stop: (() => void) | undefined;
    let cancelled = false;
    watchProfile(user, setProfile, (e) => console.warn("[profile] not loaded:", (e as Error)?.message ?? e))
      .then((unsub) => (cancelled ? unsub() : (stop = unsub)))
      .catch((e) => console.warn("[profile] not loaded:", e?.message ?? e));
    return () => {
      cancelled = true;
      stop?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  const popupOrRedirect = useCallback(async (provider: GoogleAuthProvider | OAuthProvider) => {
    const auth = getAuth(firebaseApp());
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      // Some mobile browsers block popups; fall back to a full-page redirect.
      const code = (e as { code?: string }).code;
      if (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment") {
        await signInWithRedirect(auth, provider);
        return;
      }
      throw e;
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    await popupOrRedirect(provider);
  }, [popupOrRedirect]);

  const signInWithApple = useCallback(async () => {
    const provider = new OAuthProvider("apple.com");
    provider.addScope("email");
    provider.addScope("name");
    await popupOrRedirect(provider);
  }, [popupOrRedirect]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      profile,
      profileOpen,
      openProfile: () => setProfileOpen(true),
      closeProfile: () => setProfileOpen(false),
      userChanged: () => setRev((r) => r + 1),
      dialogOpen,
      openSignIn: () => setDialogOpen(true),
      closeSignIn: () => setDialogOpen(false),
      signInWithGoogle,
      signInWithApple,
      signInWithEmail: async (email, password) => {
        await signInWithEmailAndPassword(getAuth(firebaseApp()), email.trim(), password);
      },
      createAccount: async (email, password, name) => {
        const cred = await createUserWithEmailAndPassword(getAuth(firebaseApp()), email.trim(), password);
        if (name?.trim()) {
          await updateProfile(cred.user, { displayName: name.trim() });
          setRev((r) => r + 1); // same User object, new name: re-render
        }
      },
      resetPassword: async (email) => {
        await sendPasswordResetEmail(getAuth(firebaseApp()), email.trim());
      },
      signOut: async () => {
        await fbSignOut(getAuth(firebaseApp()));
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, loading, profile, profileOpen, dialogOpen, signInWithGoogle, signInWithApple, rev],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
}

/** Plain-language versions of Firebase's error codes. */
export function authErrorMessage(e: unknown) {
  const code = (e as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "That email and password don't match an account.";
    case "auth/email-already-in-use":
      return "There's already an account with that email. Try signing in.";
    case "auth/weak-password":
      return "Use at least 6 characters for your password.";
    case "auth/invalid-email":
      return "That doesn't look like an email address.";
    case "auth/too-many-requests":
      return "Too many tries. Wait a minute and try again.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "";
    case "auth/operation-not-allowed":
      return "That sign-in method isn't turned on yet. Try another option.";
    case "auth/account-exists-with-different-credential":
      return "You already have an account with that email using a different sign-in method. Use that one.";
    case "auth/unauthorized-domain":
      return "This site's domain isn't authorized for sign-in yet (Firebase → Authentication → Settings → Authorized domains).";
    case "auth/network-request-failed":
      return "No connection. Check your signal and try again.";
    default:
      return "Something went wrong signing in. Please try again.";
  }
}
