"use client";

import { useEffect } from "react";
import { startAnalytics } from "@/lib/firebase";

/** Boots Firebase (and Analytics) once on the client. Renders nothing. */
export function FirebaseInit() {
  useEffect(() => {
    startAnalytics().catch((e) => console.warn("[firebase] analytics not started:", e?.message ?? e));
  }, []);
  return null;
}
