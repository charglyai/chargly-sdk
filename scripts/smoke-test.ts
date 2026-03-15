/**
 * Opt-in smoke test against a real Chargly API.
 *
 * Run only when you have a dev/staging API and valid credentials.
 * No secrets hardcoded — all from environment variables.
 *
 * Required:
 *   CHARGLY_SECRET_KEY — Your API key
 *
 * Optional:
 *   CHARGLY_BASE_URL — API base (default: https://api.chargly.ai)
 *   CHARGLY_SMOKE_CUSTOMER_ID — Customer ID for wallet/checkout/meter tests.
 *     If unset, only listCreditPacks and listPricingRecommendations run.
 *
 * Usage:
 *   CHARGLY_SECRET_KEY=sk_... CHARGLY_SMOKE_CUSTOMER_ID=user_123 npx ts-node scripts/smoke-test.ts
 */

import { Chargly, CharglyError } from "../src";

const API_KEY = process.env.CHARGLY_SECRET_KEY;
const BASE_URL = process.env.CHARGLY_BASE_URL ?? "https://api.chargly.ai";
const CUSTOMER_ID = process.env.CHARGLY_SMOKE_CUSTOMER_ID;

async function run() {
  if (!API_KEY) {
    console.error("CHARGLY_SECRET_KEY is required.");
    process.exit(1);
  }

  const chargly = new Chargly({ apiKey: API_KEY, baseUrl: BASE_URL });
  const results: { name: string; ok: boolean; error?: string }[] = [];

  // 1. listCreditPacks — no customer needed, validates basic connectivity
  try {
    const { packs } = await chargly.listCreditPacks();
    results.push({ name: "listCreditPacks", ok: true });
    console.log(`✓ listCreditPacks: ${packs.length} pack(s)`);
  } catch (err) {
    const msg = err instanceof CharglyError ? err.message : String(err);
    results.push({ name: "listCreditPacks", ok: false, error: msg });
    console.error(`✗ listCreditPacks: ${msg}`);
  }

  if (CUSTOMER_ID) {
    // 2. getWallet
    try {
      const wallet = await chargly.getWallet({ customerId: CUSTOMER_ID });
      results.push({ name: "getWallet", ok: true });
      console.log(`✓ getWallet: ${wallet.balance} ${wallet.unit}`);
    } catch (err) {
      const msg = err instanceof CharglyError ? err.message : String(err);
      results.push({ name: "getWallet", ok: false, error: msg });
      console.error(`✗ getWallet: ${msg}`);
    }

    // 3. meterEvent — deducts 1 credit
    try {
      const result = await chargly.meterEvent({
        customerId: CUSTOMER_ID,
        event: "smoke.test",
        credits: 1,
        metadata: { source: "sdk-smoke-test" },
      });
      results.push({ name: "meterEvent", ok: true });
      console.log(`✓ meterEvent: deducted 1, remaining ${result.remainingBalance}`);
    } catch (err) {
      const msg = err instanceof CharglyError ? err.message : String(err);
      results.push({ name: "meterEvent", ok: false, error: msg });
      console.error(`✗ meterEvent: ${msg}`);
    }

    // 4. createCheckout
    try {
      const { packs } = await chargly.listCreditPacks();
      const packId = packs[0]?.id ?? "chargly_2000";
      const checkout = await chargly.createCheckout({
        customerId: CUSTOMER_ID,
        creditPackId: packId,
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      });
      results.push({ name: "createCheckout", ok: true });
      console.log(`✓ createCheckout: ${checkout.checkoutUrl.slice(0, 50)}...`);
    } catch (err) {
      const msg = err instanceof CharglyError ? err.message : String(err);
      results.push({ name: "createCheckout", ok: false, error: msg });
      console.error(`✗ createCheckout: ${msg}`);
    }
  } else {
    console.log("(CHARGLY_SMOKE_CUSTOMER_ID not set — skipping getWallet, meterEvent, createCheckout)");
  }

  // 5. listPricingRecommendations — Pricing Advisor
  try {
    const { recommendations } = await chargly.listPricingRecommendations({ limit: 5 });
    results.push({ name: "listPricingRecommendations", ok: true });
    console.log(`✓ listPricingRecommendations: ${recommendations.length} recommendation(s)`);
  } catch (err) {
    const msg = err instanceof CharglyError ? err.message : String(err);
    results.push({ name: "listPricingRecommendations", ok: false, error: msg });
    console.error(`✗ listPricingRecommendations: ${msg}`);
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\nResult: ${passed} passed, ${failed} failed`);

  process.exit(failed > 0 ? 1 : 0);
}

run();
