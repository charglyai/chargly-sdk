/**
 * Simulates an external consumer: imports from built dist and verifies typing.
 * Run with: npm run build && npx tsc --noEmit -p scripts/consumer-check.tsconfig.json
 * Type-check only — no execution, no API calls.
 */

import { Chargly, CharglyError } from "../dist";
import type {
  CharglyConfig,
  GetWalletResponse,
  MeterEventResponse,
  CreditPack,
  PricingRecommendation,
} from "../dist";

const config: CharglyConfig = {
  apiKey: "sk_test",
  baseUrl: "https://api.example.com",
};

const client = new Chargly(config);

// Type assertions — compile-time validation of method signatures
const _w: Promise<GetWalletResponse> = client.getWallet({ customerId: "u1" });
const _m: Promise<MeterEventResponse> = client.meterEvent({
  customerId: "u1",
  event: "test",
  credits: 1,
});
const _p: Promise<{ packs: CreditPack[] }> = client.listCreditPacks();
const _r: Promise<{ recommendations: PricingRecommendation[] }> =
  client.listPricingRecommendations();

const _err: CharglyError = new CharglyError("test", { statusCode: 400, code: "bad_request" });
