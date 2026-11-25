// Daily check of App Store subscriptions with Apple's App Store Server API.
// Kept apart from appStore.ts because it needs the API key in Firebase
// secrets, and Firebase won't deploy anything while a declared secret is
// missing.

import { AppStoreServerAPIClient, Environment } from "@apple/app-store-server-library";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { defineSecret } from "firebase-functions/params";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { BUNDLE_ID, stateFromStatus, stateFromTransaction } from "./appStoreLogic";
import {
  REGION,
  environmentOf,
  logEvent,
  ms,
  saveSubscription,
  syncPlan,
  transactionLog,
  verifier,
  type StoredSub,
} from "./appStore";

// App Store Server API key (App Store Connect → Users and Access → Integrations → In-App Purchase).
const ISSUER_ID = defineSecret("APP_STORE_ISSUER_ID");
const KEY_ID = defineSecret("APP_STORE_KEY_ID");
const PRIVATE_KEY = defineSecret("APP_STORE_PRIVATE_KEY");

const db = () => getFirestore();

/**
 * Once a day: anything still counted as Milecast One whose period ended more
 * than an hour ago gets checked with Apple's App Store Server API, in case a
 * notification never arrived.
 */
export const expireLapsedPlans = onSchedule(
  {
    schedule: "every day 04:00",
    timeZone: "America/Denver",
    region: REGION,
    memory: "256MiB",
    secrets: [ISSUER_ID, KEY_ID, PRIVATE_KEY],
  },
  async () => {
    const cutoff = Timestamp.fromMillis(Date.now() - 60 * 60 * 1000);
    const due = await db().collection("appStoreSubscriptions").where("expiresAt", "<", cutoff).get();
    const clients = new Map<Environment, AppStoreServerAPIClient>();
    const client = (env: Environment) => {
      let c = clients.get(env);
      if (!c) {
        c = new AppStoreServerAPIClient(PRIVATE_KEY.value(), KEY_ID.value(), ISSUER_ID.value(), BUNDLE_ID, env);
        clients.set(env, c);
      }
      return c;
    };

    let checked = 0;
    for (const doc of due.docs) {
      const sub = doc.data() as StoredSub;
      if (!["active", "grace", "billing_retry"].includes(sub.state)) continue;
      const env = environmentOf(sub.environment) ?? Environment.PRODUCTION;
      checked++;
      try {
        const statuses = await client(env).getAllSubscriptionStatuses(doc.id);
        const last = statuses.data?.flatMap((g) => g.lastTransactions ?? []).find((l) => l.originalTransactionId === doc.id);
        if (!last?.signedTransactionInfo) continue;
        const t = await verifier(env).verifyAndDecodeTransaction(last.signedTransactionInfo);
        const state = stateFromStatus(last.status) ?? stateFromTransaction(t, Date.now());
        await logEvent(`check-${doc.id}-${new Date().toISOString().slice(0, 10)}`, {
          type: "DAILY_CHECK", uid: sub.uid, status: last.status ?? null, state, ...transactionLog(t),
        });
        await saveSubscription(t, state, sub.uid, Date.now(), "daily-check");
      } catch (e) {
        // Apple unreachable or the key is wrong: only expire once it's clearly over.
        logger.warn("status check failed", { originalTransactionId: doc.id, error: String(e) });
        const ended = ms(sub.expiresAt) ?? 0;
        if (Date.now() - ended > 3 * 24 * 60 * 60 * 1000) {
          await doc.ref.update({ state: "expired", updatedBy: "daily-check:fallback", updatedAt: FieldValue.serverTimestamp() });
          if (sub.uid) await syncPlan(sub.uid, "daily-check:fallback");
        }
      }
    }
    logger.info("daily App Store check done", { due: due.size, checked });
  },
);
