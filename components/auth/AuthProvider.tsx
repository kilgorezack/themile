"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
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

interface AuthState {
  user: User | null;
  /** true until Firebase has told us whether someone is signed in */
  loading: boolean;
  /** the sign-in dialog, shared so any page can open it */
  dialogOpen: boolean;
  openSignIn: () => void;
  closeSignIn: () => void;
  signInWithGoogle: () => Promise<void>;
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

  useEffect(() => {
    const auth = getAuth(firebaseApp());
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (u) setDialogOpen(false);
    });
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const auth = getAuth(firebaseApp());
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
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

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      dialogOpen,
      openSignIn: () => setDialogOpen(true),
      closeSignIn: () => setDialogOpen(false),
      signInWithGoogle,
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
    [user, loading, dialogOpen, signInWithGoogle, rev],
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
    case "auth/unauthorized-domain":
      return "This site's domain isn't authorized for sign-in yet (Firebase → Authentication → Settings → Authorized domains).";
    case "auth/network-request-failed":
      return "No connection. Check your signal and try again.";
    default:
      return "Something went wrong signing in. Please try again.";
  }
}
