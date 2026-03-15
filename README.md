# @chargly/sdk

Credit-first AI billing SDK for Chargly. Meter usage, manage wallets, and create checkouts for credit top-ups.

## Install

```bash
npm install @chargly/sdk
```

## Quickstart

```typescript
import { Chargly } from "@chargly/sdk";

const chargly = new Chargly({
  apiKey: process.env.CHARGLY_SECRET_KEY!,
});

// Meter a usage event
await chargly.meterEvent({
  customerId: "user_123",
  event: "image.generate",
  credits: 40,
});
```

## Examples

### getWallet

Get wallet balance for a customer.

```typescript
const wallet = await chargly.getWallet({ customerId: "user_123" });
console.log(wallet.balance, wallet.unit); // 500 "credits"
```

### meterEvent

Record a usage event and deduct credits from the customer's wallet.

```typescript
const result = await chargly.meterEvent({
  customerId: "user_123",
  event: "image.generate",
  credits: 40,
  metadata: { requestId: "req_abc" },
});
console.log(result.remainingBalance); // 460
```

### createCheckout

Create a Stripe Checkout session for a customer to buy credits.

```typescript
const checkout = await chargly.createCheckout({
  customerId: "user_123",
  creditPackId: "chargly_2000",
  successUrl: "https://myapp.com/success",
  cancelUrl: "https://myapp.com/cancel",
});
// Redirect user to checkout.checkoutUrl
```

### listCreditPacks

List available credit packs.

```typescript
const { packs } = await chargly.listCreditPacks();
packs.forEach((pack) => {
  console.log(pack.name, pack.credits, pack.price); // price in cents
});
```

## Error handling

```typescript
import { Chargly, CharglyError } from "@chargly/sdk";

try {
  await chargly.meterEvent({ customerId: "user_123", event: "chat.reply", credits: 100 });
} catch (err) {
  if (err instanceof CharglyError) {
    console.error(err.message, err.statusCode, err.code);
  }
}
```

## Pricing Advisor

Pricing Advisor helps you decide what AI actions should cost. Recommendations are deterministic, explainable, versioned, and human-approved — you apply or reject; nothing changes without your approval.

### Methods

| Method | Description |
|--------|-------------|
| `getPricingRule({ feature })` | Get a pricing rule by feature |
| `listPricingRecommendations({ feature?, status?, limit? })` | List recommendations, optionally filtered |
| `getPricingRecommendation({ recommendationId })` | Get a single recommendation |
| `explainPricingRecommendation({ recommendationId })` | Get detailed explanation (reason, confidence, margin) |
| `applyPricingRecommendation({ recommendationId })` | Apply recommendation — creates new pricing rule version |
| `rejectPricingRecommendation({ recommendationId })` | Reject recommendation — preserves audit history |

### Example

```typescript
// List pending recommendations
const { recommendations } = await chargly.listPricingRecommendations({ status: "pending" });

for (const rec of recommendations) {
  const explanation = await chargly.explainPricingRecommendation({
    recommendationId: rec.id,
  });
  console.log(`${rec.feature}: ${rec.currentCredits} → ${rec.recommendedCredits} credits`);
  console.log(`Reason: ${explanation.reason} (${explanation.confidence} confidence)`);

  // Apply or reject
  await chargly.applyPricingRecommendation({ recommendationId: rec.id });
}
```

## Configuration

| Option   | Type   | Default                    | Description                    |
| -------- | ------ | -------------------------- | ------------------------------ |
| `apiKey` | string | required                   | Your Chargly secret API key    |
| `baseUrl`| string | `https://api.chargly.ai`   | Override API base URL          |
