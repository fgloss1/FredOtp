import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { fulfillPaystackPayment } from "@/lib/payments";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  const url = new URL(request.url);
  const reference = url.searchParams.get("reference")?.trim();
  if (!reference || reference.length > 80) {
    return Response.json({ error: "Payment reference is required." }, { status: 400 });
  }

  const [payment] = await db
    .select({ id: payments.id })
    .from(payments)
    .where(and(eq(payments.reference, reference), eq(payments.userId, user.id)))
    .limit(1);

  if (!payment) return Response.json({ error: "Payment not found." }, { status: 404 });

  try {
    const result = await fulfillPaystackPayment(reference, user.id);
    if (!result.ok) return Response.json({ error: result.error }, { status: 400 });

    return Response.json({
      ok: true,
      alreadyFulfilled: result.alreadyFulfilled,
      balanceCents: result.balanceCents,
      bonusCents: result.bonusCents,
      amountCents: result.amountCents,
    });
  } catch (error) {
    console.error("Paystack verification error", error);
    return Response.json(
      { error: "Could not verify this payment right now. Please check your wallet shortly." },
      { status: 503 },
    );
  }
}
