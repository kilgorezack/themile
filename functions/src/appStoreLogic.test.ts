import { test } from "node:test";
import assert from "node:assert/strict";
import {
  accountToken,
  grantsOne,
  isNewer,
  planFor,
  sameToken,
  stateFromStatus,
  stateFromTransaction,
  stateOverrideForNotification,
} from "./appStoreLogic";

test("account token matches the iOS app's StoreEntitlements.accountToken(for:)", () => {
  // Values printed by the same Swift code the app uses.
  assert.equal(accountToken("abc123"), "89e389b1-eb8d-b84e-02b1-0ac649186cb1");
  assert.equal(accountToken("Xy9kQ2LmN0pRsTuVwXyZ1a2b3c4d"), "b105b4f3-02c9-36ec-7d12-889fe1ed6da6");
  assert.ok(sameToken("89E389B1-EB8D-B84E-02B1-0AC649186CB1", accountToken("abc123")));
  assert.ok(!sameToken(accountToken("someone-else"), accountToken("abc123")));
  assert.ok(!sameToken(undefined, accountToken("abc123")));
});

test("Apple status codes", () => {
  assert.equal(stateFromStatus(1), "active");
  assert.equal(stateFromStatus(2), "expired");
  assert.equal(stateFromStatus(3), "billing_retry");
  assert.equal(stateFromStatus(4), "grace");
  assert.equal(stateFromStatus(5), "revoked");
  assert.equal(stateFromStatus(undefined), undefined);
});

test("state from a transaction", () => {
  const now = 1_000_000;
  assert.equal(stateFromTransaction({ expiresDate: now + 1 }, now), "active");
  assert.equal(stateFromTransaction({ expiresDate: now - 1 }, now), "expired");
  assert.equal(stateFromTransaction({ expiresDate: now + 1, revocationDate: now - 5 }, now), "revoked");
  assert.equal(stateFromTransaction({ expiresDate: now - 1 }, now, { gracePeriodExpiresDate: now + 10 }), "grace");
  assert.equal(stateFromTransaction({ expiresDate: now - 1 }, now, { isInBillingRetryPeriod: true }), "billing_retry");
});

test("refunds and revocations always end access", () => {
  assert.equal(stateOverrideForNotification("REFUND"), "revoked");
  assert.equal(stateOverrideForNotification("REVOKE"), "revoked");
  assert.equal(stateOverrideForNotification("DID_RENEW"), undefined);
});

test("which states include Milecast One", () => {
  assert.ok(grantsOne("active"));
  assert.ok(grantsOne("grace"));
  assert.ok(!grantsOne("billing_retry"));
  assert.ok(!grantsOne("expired"));
  assert.ok(!grantsOne("revoked"));
  assert.equal(planFor([]), "free");
  assert.equal(planFor(["expired", "active"]), "one");
  assert.equal(planFor(["revoked", "billing_retry"]), "free");
});

test("older news never overwrites newer", () => {
  assert.ok(isNewer({ transactionId: "2", expiresAt: 200 }, undefined));
  assert.ok(isNewer({ transactionId: "2", expiresAt: 200 }, { lastTransactionId: "1", expiresAt: 100 }));
  assert.ok(!isNewer({ transactionId: "1", expiresAt: 100 }, { lastTransactionId: "2", expiresAt: 200 }));
  // Same transaction, later news (a refund): applies.
  assert.ok(isNewer({ transactionId: "2", expiresAt: 200, signedDate: 50 }, { lastTransactionId: "2", expiresAt: 200, signedDate: 40 }));
  // Same transaction, earlier news arriving late: ignored.
  assert.ok(!isNewer({ transactionId: "2", expiresAt: 200, signedDate: 30 }, { lastTransactionId: "2", expiresAt: 200, signedDate: 40 }));
});

test("tier on the profile", () => {
  const { tierFor, planForTier } = require("./appStoreLogic");
  assert.equal(tierFor([]), "free");
  assert.equal(tierFor([{ state: "expired", productId: "one.milecast.yearly" }]), "free");
  assert.equal(tierFor([{ state: "active", productId: "one.milecast.monthly" }]), "one_monthly");
  assert.equal(tierFor([{ state: "grace", productId: "one.milecast.yearly" }]), "one_annual");
  assert.equal(tierFor([
    { state: "active", productId: "one.milecast.monthly" },
    { state: "active", productId: "one.milecast.yearly" },
  ]), "one_annual");
  assert.equal(tierFor([{ state: "billing_retry", productId: "one.milecast.monthly" }]), "free");
  assert.equal(planForTier("free"), "free");
  assert.equal(planForTier("one_monthly"), "one");
  assert.equal(planForTier("one_annual"), "one");
});
