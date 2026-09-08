import { eq } from "drizzle-orm";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { initializePaystackTransaction, usdCentsToProviderMinor, paystackCurrency } from "@/lib/paystack";
import { reference } from "@/lib/reference";

export const dynamic = "force-dynamic";

const MIN_AMOUNT_CENTS = 200;
const MAX_AMOUNT_CENTS = 100000;

const METHOD_CHANNELS: Record<string, string[]> = {
  card: ["card"],
  transfer: ["bank_transfer"],
  ussd: ["ussd"],
};

function appUrl(): string {
  const value = process.env.NEXT_PUBLIC_APP_URL;
  if (!value) throw new Error("NEXT_PUBLIC_APP_URL is required");
  return value.replace(/\/$/, "");
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: { amountCents?: number; method?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const amountCents = Math.round(Number(body.amountCents));
  const method = body.method ?? "card";
  const channels = METHOD_CHANNELS[method];

  if (!Number.isFinite(amountCents) || amountCents < MIN_AMOUNT_CENTS || amountCents > MAX_AMOUNT_CENTS) {
    return Response.json({ error: "Top-up must be between $2 and $1,000." }, { status: 400 });
  }
  if (!channels) return Response.json({ error: "Unsupported payment method." }, { status: 400 });

  let providerAmountMinor: number;
  try {
    providerAmountMinor = usdCentsToProviderMinor(amountCents);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Payment configuration is incomplete." }, { status: 500 });
  }

  const bonusCents = amountCents >= 5000 ? Math.round(amountCents * 0.1) : 0;
  const paymentReference = reference("PAY");

  await db.insert(payments).values({
    userId: user.id,
    reference: paymentReference,
    method,
    amountCents,
    bonusCents,
    providerAmountMinor,
    currency: paystackCurrency(),
    status: "pending",
  });

  try {
    const initialized = await initializePaystackTransaction({
      email: user.email,
      reference: paymentReference,
      amountMinor: providerAmountMinor,
      channels,
      callbackUrl: `${appUrl()}/payment/callback`,
      metadata: {
        userId: user.id,
        amountCents,
        bonusCents,
      },
    });

    if (!initialized.status || !initialized.data?.authorization_url) {
      await db.update(payments).set({ status: "failed" }).where(eq(payments.reference, paymentReference));
      return Response.json({ error: initialized.message || "Could not initialize payment." }, { status: 502 });
    }

    await db
      .update(payments)
      .set({ authorizationUrl: initialized.data.authorization_url })
      .where(eq(payments.reference, paymentReference));

    return Response.json({
      authorizationUrl: initialized.data.authorization_url,
      reference: paymentReference,
    });
  } catch (error) {
    console.error(error);
    await db.update(payments).set({ status: "failed" }).where(eq(payments.reference, paymentReference));
    return Response.json({ error: "Could not initialize payment." }, { status: 502 });
  }
}
