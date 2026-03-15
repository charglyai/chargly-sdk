# Chargly SDK Examples

Run examples from the `chargly-sdk` root. Requires a Chargly API key from the dashboard.

## Quickstart

```bash
CHARGLY_SECRET_KEY=sk_... npm run example
```

Or directly:

```bash
CHARGLY_SECRET_KEY=sk_... npx ts-node examples/quickstart.ts
```

With custom base URL (e.g. local API):

```bash
CHARGLY_SECRET_KEY=sk_... CHARGLY_BASE_URL=http://localhost:3000 npx ts-node examples/quickstart.ts
```

## Smoke test (real API)

Opt-in smoke test against a dev/staging API. No secrets hardcoded.

```bash
CHARGLY_SECRET_KEY=sk_... CHARGLY_BASE_URL=http://localhost:3000 CHARGLY_SMOKE_CUSTOMER_ID=user_123 npm run smoke
```

## Prerequisites

- Node.js 18+
- `ts-node`: `npm install -g ts-node` or use `npx ts-node`
- Chargly API key (create an app in the dashboard, then Create API key)
