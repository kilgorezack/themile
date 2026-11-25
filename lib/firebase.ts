"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";

/**
 * Firebase web config. These values are public identifiers (they ship to every
 * browser); access is controlled by Firebase Auth + Security Rules, not by
 * keeping this secret.
 */
export const firebaseConfig = {
  apiKey: "AIzaSyDHQgSS_UP7gATg1FyRTwUjmy9ZY4mak9U",
  authDomain: "the-mile-2c303.firebaseapp.com",
  projectId: "the-mile-2c303",
  storageBucket: "the-mile-2c303.firebasestorage.app",
  messagingSenderId: "974618977718",
  appId: "1:974618977718:web:cfbab72a012f6d37facd17",
  measurementId: "G-B5J6YT1YC1",
};

/**
 * reCAPTCHA Enterprise site key for Firebase App Check (public, like the config
 * above). Set NEXT_PUBLIC_RECAPTCHA_SITE_KEY in Vercel; without it App Check is
 * skipped, so nothing breaks before it's configured.
 */
const APP_CHECK_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

/**
 * One app instance per page, safe across hot reloads. Browser only.
 * App Check starts with the app so every Firebase request carries a token.
 */
export function firebaseApp(): FirebaseApp {
  if (getApps().length) return getApp();
  const app = initializeApp(firebaseConfig);
  if (APP_CHECK_SITE_KEY && typeof window !== "undefined") {
    // On localhost, use a debug token instead of reCAPTCHA. The browser console
    // prints it on first load; register it under App Check → Apps → Manage debug tokens.
    if (location.hostname === "localhost") {
      (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }
    try {
      initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(APP_CHECK_SITE_KEY),
        isTokenAutoRefreshEnabled: true,
      });
    } catch (e) {
      console.warn("[firebase] App Check not started:", (e as Error)?.message ?? e);
    }
  }
  return app;
}

/** Starts Google Analytics for Firebase where the browser supports it. */
export async function startAnalytics() {
  const { getAnalytics, isSupported } = await import("firebase/analytics");
  if (await isSupported()) return getAnalytics(firebaseApp());
  return null;
}
