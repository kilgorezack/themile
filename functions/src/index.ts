import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging, type MulticastMessage } from "firebase-admin/messaging";
import { logger } from "firebase-functions";
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { decide, type Alert, type AlertState, type Summary } from "./alerts";

initializeApp();
const db = getFirestore();

const SUMMARY_URL = "https://mile.fish/api/summary";
const REGION = "us-central1";

/**
 * Every 10 minutes: read the same conditions the app shows, decide which
 * alerts are due, and push each one to the devices of everyone who turned it
 * on (profile `alerts.<kind> == true`).
 */
export const sendAlerts = onSchedule(
  { schedule: "every 10 minutes", timeZone: "America/Denver", region: REGION, retryCount: 0, memory: "256MiB" },
  async () => {
    const res = await fetch(SUMMARY_URL, { headers: { "User-Agent": "milecast-alerts" } });
    if (!res.ok) {
      logger.warn("summary fetch failed", { status: res.status });
      return;
    }
    const summary = (await res.json()) as Summary;
    const stateRef = db.doc("system/alerts");
    const state = ((await stateRef.get()).data() ?? {}) as AlertState;

    const { alerts, state: next } = decide(summary, state);
    // Save first, so a failure part-way through never sends the same alert twice.
    await stateRef.set(next);
    for (const alert of alerts) {
      const sent = await sendToSubscribers(alert);
      logger.info("alert sent", { kind: alert.kind, title: alert.title, ...sent });
    }
  },
);

/** Pushes one alert to every device of every user with that alert turned on. */
async function sendToSubscribers(alert: Alert) {
  const users = await db.collection("users").where(`alerts.${alert.kind}`, "==", true).select().get();
  const tokens: { token: string; path: string }[] = [];
  for (const u of users.docs) {
    const devices = await u.ref.collection("devices").get();
    for (const d of devices.docs) tokens.push({ token: d.id, path: d.ref.path });
  }
  return send(alert, tokens);
}

async function send(alert: Alert, tokens: { token: string; path: string }[]) {
  let ok = 0, failed = 0, removed = 0;
  for (let i = 0; i < tokens.length; i += 500) {
    const batch = tokens.slice(i, i + 500);
    const message: MulticastMessage = {
      tokens: batch.map((t) => t.token),
      notification: { title: alert.title, body: alert.body },
      data: { kind: alert.kind, link: alert.link },
      apns: {
        payload: { aps: { sound: "default", "thread-id": alert.kind } },
        headers: { "apns-priority": "10" },
      },
    };
    const out = await getMessaging().sendEachForMulticast(message);
    ok += out.successCount;
    failed += out.failureCount;
    // Forget tokens Apple/Google say are gone (app deleted, signed out elsewhere, etc.).
    const dead = out.responses
      .map((r, j) => ({ r, t: batch[j] }))
      .filter(({ r }) =>
        ["messaging/registration-token-not-registered", "messaging/invalid-registration-token"].includes(r.error?.code ?? ""),
      );
    await Promise.all(dead.map(({ t }) => db.doc(t.path).delete()));
    removed += dead.length;
  }
  return { devices: tokens.length, ok, failed, removed };
}

/**
 * POST with `Authorization: Bearer <Firebase ID token>`: sends a test
 * notification to the signed-in user's own devices. Used by
 * Account → "Send a test notification" in the app.
 */
export const testPush = onRequest({ region: REGION, cors: false, memory: "256MiB" }, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("POST only");
    return;
  }
  const idToken = (req.headers.authorization ?? "").replace(/^Bearer /, "");
  let uid: string;
  try {
    uid = (await getAuth().verifyIdToken(idToken)).uid;
  } catch {
    res.status(401).json({ error: "Sign in again and retry." });
    return;
  }
  const devices = await db.collection(`users/${uid}/devices`).get();
  if (devices.empty) {
    res.status(404).json({ error: "This account has no devices registered for notifications yet." });
    return;
  }
  const result = await send(
    { kind: "flow", title: "Milecast notifications are on", body: "This is a test. Alerts you turn on will arrive like this.", link: "milecast://home" },
    devices.docs.map((d) => ({ token: d.id, path: d.ref.path })),
  );
  res.json(result);
});
