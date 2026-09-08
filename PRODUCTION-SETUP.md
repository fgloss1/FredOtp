# Production setup — Phase 1

This checkpoint hardens wallet funding around Paystack and removes the insecure instant-credit flow. It does **not** connect the rental engine to a third-party OTP/number supplier yet.

## 1. Install

```bash
npm install
```

## 2. Configure environment variables

Copy `.env.example` to `.env.local` for local testing. Never commit `.env*` files.

Required for payment testing:

- `DATABASE_URL` — your PostgreSQL connection string
- `NEXT_PUBLIC_APP_URL` — the exact public URL of the app, without a trailing slash
- `PAYSTACK_SECRET_KEY` — use the Paystack test secret key during testing
- `PAYSTACK_CURRENCY` — `NGN` for a Nigerian Paystack integration
- `PAYSTACK_USD_TO_NGN` — the USD-to-NGN conversion rate you intentionally use for your internal USD catalog
- `NEXT_PUBLIC_USD_TO_NGN` — same display rate for the browser UI

## 3. Database

Generate a migration from the current Drizzle schema, then review it before applying it:

```bash
npm run db:generate
npm run db:migrate
```

The new schema adds a `payments` table and unique payment/transaction references.

## 4. Seed safely

For development only, demo data can be enabled with:

```text
ALLOW_DEMO_DATA=true
```

For production, leave that unset. Set `NODE_ENV=production` and, before activating services, provide a comma-separated allow-list in `PRODUCTION_SERVICE_SLUGS`. Example:

```text
PRODUCTION_SERVICE_SLUGS=service-one,service-two
```

Only those service slugs remain active in production seed data.

## 5. Paystack dashboard

Create/configure the Paystack integration, then set the webhook URL to:

```text
https://YOUR-DOMAIN/api/payments/paystack/webhook
```

Use the same public domain in `NEXT_PUBLIC_APP_URL`. The application validates the `x-paystack-signature` HMAC-SHA512 webhook signature and then re-verifies the transaction against Paystack before crediting wallet value.

## 6. Test flow

1. Register a new test account.
2. Open Wallet.
3. Choose an amount and payment method.
4. Confirm the app redirects to Paystack checkout.
5. Complete a Paystack test payment.
6. Confirm the callback says payment was verified.
7. Confirm exactly one top-up transaction appears.
8. Retry the callback/webhook and confirm the wallet is **not** credited twice.

## 7. Deployment

Deploy the Next.js application to Vercel, add the same environment variables to the production environment, run database migrations against the production PostgreSQL database, then configure the Paystack webhook URL.

Do not activate customer-facing rental offers until the fulfillment provider integration is implemented and tested for each specific service/country combination.
