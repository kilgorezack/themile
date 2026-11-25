import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getMessaging, type MulticastMessage } from "firebase-admin/messaging";
import { logger } from "firebase-functions";
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { decide, type Alert, type AlertState, type Summary } from "./alerts";

initializeApp();
const db = getFirestore();

/** An alert, or the test message (`kind: "test"`). */
type Message = Omit<Alert, "kind"> & { kind: string };

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
  // Inbox first, so tapping the push can find (and mark read) its entry.
  const id = await saveToInbox(alert, users.docs.map((u) => u.id));
  const tokens: { token: string; path: string }[] = [];
  for (const u of users.docs) {
    const devices = await u.ref.collection("devices").get();
    for (const d of devices.docs) tokens.push({ token: d.id, path: d.ref.path });
  }
  return send(alert, tokens, id);
}

/**
 * Keeps a copy of the alert in each person's inbox at
 * users/{uid}/notifications/{id}, which the app's notifications page lists.
 * Every copy shares one id, which the push carries as `notificationId`.
 */
async function saveToInbox(alert: Message, uids: string[]): Promise<string> {
  const id = db.collection("users").doc().id;
  const entry = {
    kind: alert.kind,
    title: alert.title,
    body: alert.body,
    link: alert.link,
    read: false,
    createdAt: FieldValue.serverTimestamp(),
  };
  for (let i = 0; i < uids.length; i += 400) {
    const batch = db.batch();
    for (const uid of uids.slice(i, i + 400)) batch.set(db.doc(`users/${uid}/notifications/${id}`), entry);
    await batch.commit();
  }
  return id;
}

async function send(alert: Message, tokens: { token: string; path: string }[], notificationId: string) {
  let ok = 0, failed = 0, removed = 0;
  const errors = new Set<string>();
  for (let i = 0; i < tokens.length; i += 500) {
    const batch = tokens.slice(i, i + 500);
    const message: MulticastMessage = {
      tokens: batch.map((t) => t.token),
      notification: { title: alert.title, body: alert.body },
      data: { kind: alert.kind, link: alert.link, notificationId },
      apns: {
        payload: {
          aps: {
            sound: "default",
            "thread-id": alert.kind,
            // Lightning breaks through Focus (the app has the Time Sensitive entitlement).
            ...(alert.kind === "lightning" ? { "interruption-level": "time-sensitive" } : {}),
          },
        },
        headers: { "apns-priority": "10" },
      },
    };
    const out = await getMessaging().sendEachForMulticast(message);
    ok += out.successCount;
    failed += out.failureCount;
    for (const r of out.responses) if (r.error) errors.add(r.error.code);
    // Forget tokens Apple/Google say are gone (app deleted, signed out elsewhere, etc.).
    const dead = out.responses
      .map((r, j) => ({ r, t: batch[j] }))
      .filter(({ r }) =>
        ["messaging/registration-token-not-registered", "messaging/invalid-registration-token"].includes(r.error?.code ?? ""),
      );
    await Promise.all(dead.map(({ t }) => db.doc(t.path).delete()));
    removed += dead.length;
  }
  if (errors.size) logger.warn("push failures", { kind: alert.kind, failed, errors: [...errors] });
  return { devices: tokens.length, ok, failed, removed, errors: [...errors] };
}

/** What to tell the person when a test reached none of their devices. */
function testFailureMessage(errors: string[]): string {
  if (errors.includes("messaging/third-party-auth-error")) {
    return "Apple didn't accept the notification. The server's push setup needs fixing; try again later.";
  }
  if (errors.some((e) => e === "messaging/registration-token-not-registered" || e === "messaging/invalid-registration-token")) {
    return "This iPhone's notification registration expired. Reopen Milecast and try again.";
  }
  return "The test couldn't be delivered. Try again in a minute.";
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
  const test = {
    kind: "test",
    title: "Milecast notifications are on",
    body: "This is a test. Alerts you turn on will arrive like this, and stay here in Notifications.",
    link: "milecast://home",
  };
  const id = await saveToInbox(test, [uid]);
  const result = await send(test, devices.docs.map((d) => ({ token: d.id, path: d.ref.path })), id);
  // FCM answers per device; a test that reached none of them is a failure.
  if (result.ok === 0) {
    res.status(502).json({ ...result, error: testFailureMessage(result.errors) });
    return;
  }
  res.json(result);
});

// App Store subscriptions → profile plan (see appStore.ts).
import * as appStore from "./appStore";
export const verifyAppStorePurchase = appStore.verifyAppStorePurchase;
export const appStoreNotifications = appStore.appStoreNotifications;
// The daily check needs the App Store Server API key in Firebase secrets, and
// Firebase won't deploy anything while a declared secret is missing. Set
// APP_STORE_DAILY_CHECK=on in .env.the-mile-2c303 once the secrets exist.
if (process.env.APP_STORE_DAILY_CHECK === "on") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  exports.expireLapsedPlans = require("./appStoreDaily").expireLapsedPlans;
}
