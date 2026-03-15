/**
 * Chargly SDK Quickstart Example
 *
 * Demonstrates: getWallet, meterEvent, createCheckout, listCreditPacks
 *
 * Run (from chargly-sdk root):
 *   CHARGLY_SECRET_KEY=sk_... npx ts-node examples/quickstart.ts
 *
 * Or with custom API URL:
 *   CHARGLY_SECRET_KEY=sk_... CHARGLY_BASE_URL=https://api.chargly.ai npx ts-node examples/quickstart.ts
 *
 * Get your API key from the Chargly dashboard. Ensure the API is running (or use production).
 */

import { Chargly, CharglyError } from "../src";

const API_KEY = process.env.CHARGLY_SECRET_KEY;
const BASE_URL = process.env.CHARGLY_BASE_URL;

async function main() {
  if (!API_KEY) {
    console.error("CHARGLY_SECRET_KEY is required. Create an app and API key in the dashboard.");
    process.exit(1);
  }

  const chargly = new Chargly({
    apiKey: API_KEY,
    baseUrl: BASE_URL,
  });

  const customerId = "user_example_123";

  // 1. Get wallet balance
  const wallet = await chargly.getWallet({ customerId });
  console.log(`Wallet: ${wallet.walletId}, balance: ${wallet.balance} ${wallet.unit}`);

  // 2. List available credit packs
  const { packs } = await chargly.listCreditPacks();
  console.log("Credit packs:", packs.map((p) => `${p.name} (${p.credits} credits)`).join(", "));

  // 3. Meter a usage event (deducts credits)
  const result = await chargly.meterEvent({
    customerId,
    event: "image.generate",
    credits: 40,
    metadata: { requestId: "req_001" },
  });
  console.log(
    `Metered: ${result.deductedCredits} credits, remaining: ${result.remainingBalance}`
  );

  // 4. Create checkout (redirect user to buy credits)
  const checkout = await chargly.createCheckout({
    customerId,
    creditPackId: packs[0]?.id ?? "chargly_2000",
    successUrl: "https://myapp.com/success",
    cancelUrl: "https://myapp.com/cancel",
  });
  console.log(`Checkout URL: ${checkout.checkoutUrl}`);
}

main().catch((err) => {
  if (err instanceof CharglyError) {
    console.error(`Chargly error [${err.code ?? err.statusCode}]:`, err.message);
    if (err.statusCode === 401) {
      console.error("Check that CHARGLY_SECRET_KEY is valid and not revoked.");
    }
  } else {
    console.error(err);
  }
  process.exit(1);
});
