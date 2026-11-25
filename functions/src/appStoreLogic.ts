// Pure rules for App Store subscriptions (no Firebase, no network), so they
// can be unit-tested. The Cloud Functions in appStore.ts use these.

import { createHash } from "node:crypto";

export const BUNDLE_ID = "com.summitdigitallabsllc.Milecast";
export const PRODUCTS = ["one.milecast.monthly", "one.milecast.yearly"];

/**
 * Where a subscription stands. `active` and `grace` include Milecast One;
 * `billing_retry` (Apple still trying to charge, no grace period), `expired`
 * and `revoked` (refunded or Family Sharing removed) don't.
 */
export type SubState = "active" | "grace" | "billing_retry" | "expired" | "revoked";

export const grantsOne = (state: SubState) => state === "active" || state === "grace";

/**
 * The `appAccountToken` the iOS app attaches to purchases for a Firebase uid:
 * the first 16 bytes of SHA-256("milecast:<uid>") as a UUID. Must match
 * `StoreEntitlements.accountToken(for:)` in the app. Lowercase, as Apple sends it.
 */
export function accountToken(uid: string): string {
  const hex = createHash("sha256").update(`milecast:${uid}`).digest("hex").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export const sameToken = (a?: string | null, b?: string | null) =>
  !!a && !!b && a.toLowerCase() === b.toLowerCase();

/** Apple's subscription status codes (App Store Server API `Status`). */
export function stateFromStatus(status: number | undefined): SubState | undefined {
  switch (status) {
    case 1: return "active";
    case 2: return "expired";
    case 3: return "billing_retry";
    case 4: return "grace";
    case 5: return "revoked";
    default: return undefined;
  }
}

/** Where a subscription stands from one signed transaction (and renewal info, if known). */
export function stateFromTransaction(
  t: { expiresDate?: number; revocationDate?: number },
  now: number,
  renewal?: { gracePeriodExpiresDate?: number; isInBillingRetryPeriod?: boolean },
): SubState {
  if (t.revocationDate) return "revoked";
  if (t.expiresDate && t.expiresDate > now) return "active";
  if (renewal?.gracePeriodExpiresDate && renewal.gracePeriodExpiresDate > now) return "grace";
  if (renewal?.isInBillingRetryPeriod) return "billing_retry";
  return "expired";
}

/** Notifications that always end access, whatever else they carry. */
export function stateOverrideForNotification(type?: string): SubState | undefined {
  return type === "REFUND" || type === "REVOKE" ? "revoked" : undefined;
}

/**
 * Whether new information about a subscription should replace what's stored.
 * Notifications can arrive out of order, so older transactions never
 * overwrite newer ones; the same transaction may update its state (a refund).
 */
export function isNewer(
  incoming: { transactionId?: string; expiresAt?: number; signedDate?: number },
  stored: { lastTransactionId?: string; expiresAt?: number; signedDate?: number } | undefined,
): boolean {
  if (!stored) return true;
  if (incoming.transactionId && incoming.transactionId === stored.lastTransactionId) {
    return (incoming.signedDate ?? 0) >= (stored.signedDate ?? 0);
  }
  return (incoming.expiresAt ?? 0) >= (stored.expiresAt ?? 0);
}

/** The plan a profile should have, from the states of all its App Store subscriptions. */
export function planFor(states: SubState[]): "one" | "free" {
  return states.some(grantsOne) ? "one" : "free";
}

/** Which plan someone is on, shown on the profile as `tier`. */
export type Tier = "free" | "one_monthly" | "one_annual";

/**
 * The tier from all of a user's App Store subscriptions. If both are somehow
 * active (switching plans), yearly wins.
 */
export function tierFor(subs: { state: SubState; productId?: string | null }[]): Tier {
  const live = subs.filter((s) => grantsOne(s.state));
  if (live.some((s) => s.productId === "one.milecast.yearly")) return "one_annual";
  if (live.length) return "one_monthly";
  return "free";
}

/** `plan` always follows the tier: any paid tier is Milecast One. */
export const planForTier = (tier: Tier): "one" | "free" => (tier === "free" ? "free" : "one");
