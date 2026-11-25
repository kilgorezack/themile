// Milecast One bought in the iOS app → `plan` on the profile, so mile.fish
// knows too. Three functions:
//
//   verifyAppStorePurchase  the app saved a purchase (users/{uid}/subscriptions/appStore)
//   appStoreNotifications   Apple tells us about renewals, expiries and refunds
//   expireLapsedPlans       daily check for anything that lapsed quietly (appStoreDaily.ts)
//
// Every purchase and notification is logged to Firestore:
//
//   appStoreSubscriptions/{originalTransactionId}  current state of each subscription
//   appStoreEvents/{id}                            append-only log (txn-<id>, ntf-<uuid>, …)
//   appStoreAccountTokens/{appAccountToken}        token → uid, to match Apple's notifications
//
// These collections are server-only (the rules' catch-all denies clients).
// Only `plan` is ever written to a profile: the profile rules allow no other
// server fields.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  Environment,
  SignedDataVerifier,
  VerificationException,
  VerificationStatus,
  type JWSRenewalInfoDecodedPayload,
  type JWSTransactionDecodedPayload,
} from "@apple/app-store-server-library";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { defineInt } from "firebase-functions/params";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onRequest } from "firebase-functions/v2/https";
import {
  BUNDLE_ID,
  PRODUCTS,
  accountToken,
  isNewer,
  planFor,
  sameToken,
  stateFromStatus,
  stateFromTransaction,
  stateOverrideForNotification,
  type SubState,
} from "./appStoreLogic";

export const REGION = "us-central1";

/** The app's Apple ID: App Store Connect → the app → App Information → Apple ID. */
const APP_APPLE_ID = defineInt("APP_STORE_APP_APPLE_ID", {
  description: "Milecast's Apple ID (the number under App Store Connect → App Information)",
});

const db = () => getFirestore();

// MARK: Verifying Apple's signatures

let rootCerts: Buffer[] | undefined;
const verifiers = new Map<Environment, SignedDataVerifier>();

export function verifier(env: Environment): SignedDataVerifier {
  let v = verifiers.get(env);
  if (!v) {
    rootCerts ??= ["AppleRootCA-G3.cer", "AppleRootCA-G2.cer"].map((f) => readFileSync(join(__dirname, "..", "certs", f)));
    // Production checks the app's Apple ID too; Sandbox doesn't need it.
    v = new SignedDataVerifier(rootCerts, true, env, BUNDLE_ID, env === Environment.PRODUCTION ? APP_APPLE_ID.value() : undefined);
    verifiers.set(env, v);
  }
  return v;
}

export function environmentOf(raw: unknown): Environment | undefined {
  return raw === Environment.PRODUCTION || raw === Environment.SANDBOX ? raw : undefined;
}

/** Tries Production, then Sandbox (TestFlight and App Review purchases are Sandbox). */
async function verifyEither<T>(decode: (v: SignedDataVerifier) => Promise<T>): Promise<{ value: T; env: Environment }> {
  try {
    return { value: await decode(verifier(Environment.PRODUCTION)), env: Environment.PRODUCTION };
  } catch (e) {
    if (e instanceof VerificationException && e.status === VerificationStatus.INVALID_ENVIRONMENT) {
      return { value: await decode(verifier(Environment.SANDBOX)), env: Environment.SANDBOX };
    }
    throw e;
  }
}

// MARK: Firestore

export type StoredSub = {
  uid: string | null;
  productId: string;
  environment: string;
  state: SubState;
  expiresAt?: Timestamp;
  lastTransactionId?: string;
  signedDate?: number;
};

export const ms = (t?: Timestamp) => t?.toMillis();
const ts = (n?: number) => (n ? Timestamp.fromMillis(n) : null);

/** Logs one event. Ids are stable (txn-…, ntf-…), so a retried delivery is logged once. Returns false if already logged. */
export async function logEvent(id: string, data: Record<string, unknown>): Promise<boolean> {
  try {
    await db().collection("appStoreEvents").doc(id).create({ ...data, loggedAt: FieldValue.serverTimestamp() });
    return true;
  } catch (e) {
    if ((e as { code?: number }).code === 6) return false; // ALREADY_EXISTS
    throw e;
  }
}

/** The purchase itself, for the log: what was bought, when, for how much. */
export function transactionLog(t: JWSTransactionDecodedPayload) {
  return {
    transactionId: t.transactionId ?? null,
    originalTransactionId: t.originalTransactionId ?? null,
    productId: t.productId ?? null,
    environment: t.environment ?? null,
    purchaseDate: ts(t.purchaseDate),
    expiresAt: ts(t.expiresDate),
    revokedAt: ts(t.revocationDate),
    reason: t.transactionReason ?? null, // PURCHASE or RENEWAL
    offerType: t.offerType ?? null,
    price: t.price ?? null, // in milliunits of `currency`
    currency: t.currency ?? null,
    storefront: t.storefront ?? null,
    ownership: t.inAppOwnershipType ?? null,
    appAccountToken: t.appAccountToken ?? null,
  };
}

/**
 * Saves a subscription's state unless a newer one is already stored, then
 * brings the owner's plan in line. Returns the uid it belongs to, if known.
 */
export async function saveSubscription(
  t: JWSTransactionDecodedPayload,
  state: SubState,
  uid: string | null,
  signedDate: number | undefined,
  source: string,
): Promise<string | null> {
  const original = t.originalTransactionId;
  if (!original) return uid;
  const ref = db().collection("appStoreSubscriptions").doc(original);
  const owner = await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const stored = snap.exists ? (snap.data() as StoredSub) : undefined;
    const owner = uid ?? stored?.uid ?? null;
    const incoming = { transactionId: t.transactionId, expiresAt: t.expiresDate, signedDate };
    const storedCmp = stored && { lastTransactionId: stored.lastTransactionId, expiresAt: ms(stored.expiresAt), signedDate: stored.signedDate };
    if (!isNewer(incoming, storedCmp)) {
      // Older news; still record who it belongs to if we just learned that.
      if (stored && !stored.uid && owner) tx.update(ref, { uid: owner });
      return owner;
    }
    tx.set(ref, {
      uid: owner,
      productId: t.productId ?? stored?.productId ?? null,
      environment: t.environment ?? stored?.environment ?? null,
      state,
      expiresAt: ts(t.expiresDate),
      lastTransactionId: t.transactionId ?? null,
      signedDate: signedDate ?? null,
      updatedBy: source,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return owner;
  });
  if (owner) await syncPlan(owner, source);
  return owner;
}

/** Sets `plan` from all of the user's App Store subscriptions. Never recreates a deleted profile. */
export async function syncPlan(uid: string, source: string) {
  const subs = await db().collection("appStoreSubscriptions").where("uid", "==", uid).get();
  const plan = planFor(subs.docs.map((d) => (d.data() as StoredSub).state));
  const profile = db().collection("users").doc(uid);
  const snap = await profile.get();
  if (!snap.exists || snap.get("plan") === plan) return;
  await profile.update({ plan });
  await logEvent(`plan-${uid}-${Date.now()}`, { type: "PLAN_CHANGED", uid, plan, source });
  logger.info("plan changed", { uid, plan, source });
}

// MARK: 1. The app saved a purchase

/**
 * Runs whenever the iOS app writes `users/{uid}/subscriptions/appStore` (after
 * a purchase or restore, and when it notices a change at launch). Checks
 * Apple's signature, that it's Milecast One, and that it was bought by this
 * account, then logs it and sets the plan.
 */
export const verifyAppStorePurchase = onDocumentWritten(
  { document: "users/{uid}/subscriptions/appStore", region: REGION, memory: "256MiB" },
  async (event) => {
    const uid = event.params.uid;
    const after = event.data?.after;
    if (!after?.exists) return; // deleted with the account
    const jws = after.get("jws") as string | undefined;
    const claimedEnv = after.get("environment") as string | undefined;
    if (!jws) return;

    const env = environmentOf(claimedEnv);
    if (!env) {
      // Xcode's local StoreKit testing: signed by Xcode, not Apple. Nothing to grant.
      await logEvent(`local-${after.get("transactionId")}`, { type: "LOCAL_TEST_PURCHASE", uid, environment: claimedEnv ?? null });
      return;
    }

    let t: JWSTransactionDecodedPayload;
    try {
      t = await verifier(env).verifyAndDecodeTransaction(jws);
    } catch (e) {
      logger.warn("app purchase failed verification", { uid, error: String(e) });
      await logEvent(`bad-${uid}-${Date.now()}`, { type: "VERIFICATION_FAILED", uid, source: "app", error: String(e) });
      return;
    }
    if (!t.productId || !PRODUCTS.includes(t.productId)) return;

    // Bought with another Milecast account on this Apple ID: log it, grant nothing.
    if (t.appAccountToken && !sameToken(t.appAccountToken, accountToken(uid))) {
      await logEvent(`mismatch-${uid}-${t.transactionId}`, { type: "ACCOUNT_MISMATCH", uid, ...transactionLog(t) });
      return;
    }

    await db().collection("appStoreAccountTokens").doc(accountToken(uid)).set({ uid }, { merge: true });
    await logEvent(`txn-${t.transactionId}`, { type: "TRANSACTION", source: "app", uid, ...transactionLog(t) });
    await saveSubscription(t, stateFromTransaction(t, Date.now()), uid, t.signedDate, "app");
  },
);

// MARK: 2. Apple's notifications

/**
 * App Store Server Notifications V2. Put this function's URL in App Store
 * Connect → the app → App Information → App Store Server Notifications, for
 * both Production and Sandbox.
 */
export const appStoreNotifications = onRequest({ region: REGION, cors: false, memory: "256MiB" }, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("POST only");
    return;
  }
  const signedPayload = (req.body as { signedPayload?: unknown })?.signedPayload;
  if (typeof signedPayload !== "string") {
    res.status(400).send("Missing signedPayload");
    return;
  }

  let notification;
  let env: Environment;
  try {
    ({ value: notification, env } = await verifyEither((v) => v.verifyAndDecodeNotification(signedPayload)));
  } catch (e) {
    logger.warn("notification failed verification", { error: String(e) });
    res.status(400).send("Invalid signature");
    return;
  }

  try {
    const type = String(notification.notificationType ?? "");
    const subtype = notification.subtype ? String(notification.subtype) : null;
    const data = notification.data;
    const t = data?.signedTransactionInfo ? await verifier(env).verifyAndDecodeTransaction(data.signedTransactionInfo) : undefined;
    const renewal: JWSRenewalInfoDecodedPayload | undefined = data?.signedRenewalInfo
      ? await verifier(env).verifyAndDecodeRenewalInfo(data.signedRenewalInfo)
      : undefined;

    // Who it belongs to: the subscription we already know, else the account token.
    let uid: string | null = null;
    if (t?.originalTransactionId) {
      uid = ((await db().collection("appStoreSubscriptions").doc(t.originalTransactionId).get()).get("uid") as string | undefined) ?? null;
    }
    if (!uid && t?.appAccountToken) {
      uid = ((await db().collection("appStoreAccountTokens").doc(t.appAccountToken.toLowerCase()).get()).get("uid") as string | undefined) ?? null;
    }

    const fresh = await logEvent(`ntf-${notification.notificationUUID}`, {
      type: "NOTIFICATION",
      notificationType: type,
      subtype,
      uid,
      environment: env,
      status: data?.status ?? null,
      autoRenew: renewal?.autoRenewStatus ?? null,
      ...(t ? transactionLog(t) : {}),
    });
    if (!fresh) {
      res.status(200).send("Already handled");
      return;
    }

    if (t?.productId && PRODUCTS.includes(t.productId)) {
      if (t.transactionId) {
        await logEvent(`txn-${t.transactionId}`, { type: "TRANSACTION", source: "notification", uid, ...transactionLog(t) });
      }
      const state = stateOverrideForNotification(type) ?? stateFromStatus(data?.status) ?? stateFromTransaction(t, Date.now(), renewal);
      await saveSubscription(t, state, uid, notification.signedDate, `notification:${type}`);
    }
    res.status(200).send("OK");
  } catch (e) {
    // Apple retries on errors, so a temporary Firestore problem fixes itself.
    logger.error("notification handling failed", { error: String(e) });
    res.status(500).send("Try again");
  }
});
