"use client";

import { useEffect } from "react";
import { firebaseApp, startAnalytics } from "@/lib/firebase";

/** Boots Firebase (App Check, then Analytics) once on the client. Renders nothing. */
export function FirebaseInit() {
  useEffect(() => {
    firebaseApp();
    startAnalytics().catch((e) => console.warn("[firebase] analytics not started:", e?.message ?? e));
  }, []);
  return null;
}
