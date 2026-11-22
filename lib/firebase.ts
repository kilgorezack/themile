"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";

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

/** One app instance per page, safe across hot reloads. Browser only. */
export function firebaseApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

/** Starts Google Analytics for Firebase where the browser supports it. */
export async function startAnalytics() {
  const { getAnalytics, isSupported } = await import("firebase/analytics");
  if (await isSupported()) return getAnalytics(firebaseApp());
  return null;
}
