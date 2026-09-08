import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { payments, transactions, users } from "@/db/schema";
import { paystackCurrency, verifyPaystackTransaction } from "@/lib/paystack";

export async function fulfillPaystackPayment(reference: string, expectedUserId?: number): Promise<
  | { ok: true; alreadyFulfilled: boolean; balanceCents: number; bonusCents: number; amountCents: number }
  | { ok: false; error: string }
> {
  const verified = await verifyPaystackTransaction(reference);
  if (!verified.status || !verified.data) return { ok: false, error: "Payment verification failed." };

  const data = verified.data;
  if (data.status !== "success") return { ok: false, error: "Payment is not successful." };
  if (data.reference !== reference) return { ok: false, error: "Payment reference mismatch." };

  return db.transaction(async (tx) => {
    const [payment] = await tx
      .select()
      .from(payments)
      .where(eq(payments.reference, reference))
      .limit(1);

    if (!payment) return { ok: false as const, error: "Payment record not found." };
    if (expectedUserId !== undefined && payment.userId !== expectedUserId) {
      return { ok: false as const, error: "Payment does not belong to this account." };
    }

    if (payment.currency !== paystackCurrency()) {
      return { ok: false as const, error: "Payment currency mismatch." };
    }
    if (data.currency.toUpperCase() !== payment.currency.toUpperCase()) {
      return { ok: false as const, error: "Payment currency mismatch." };
    }
    if (data.amount !== payment.providerAmountMinor) {
      return { ok: false as const, error: "Payment amount mismatch." };
    }

    if (payment.status === "completed") {
      const [current] = await tx
        .select({ balanceCents: users.balanceCents })
        .from(users)
        .where(eq(users.id, payment.userId))
        .limit(1);
      return {
        ok: true as const,
        alreadyFulfilled: true,
        balanceCents: current?.balanceCents ?? 0,
        bonusCents: payment.bonusCents,
        amountCents: payment.amountCents,
      };
    }

    const [claimed] = await tx
      .update(payments)
      .set({
        status: "completed",
        providerTransactionId: String(data.id),
        paidAt: data.paid_at ? new Date(data.paid_at) : new Date(),
      })
      .where(and(eq(payments.id, payment.id), eq(payments.status, "pending")))
      .returning({ id: payments.id });

    if (!claimed) {
      const [current] = await tx
        .select({ balanceCents: users.balanceCents })
        .from(users)
        .where(eq(users.id, payment.userId))
        .limit(1);
      return {
        ok: true as const,
        alreadyFulfilled: true,
        balanceCents: current?.balanceCents ?? 0,
        bonusCents: payment.bonusCents,
        amountCents: payment.amountCents,
      };
    }

    const totalCents = payment.amountCents + payment.bonusCents;
    const [updatedUser] = await tx
      .update(users)
      .set({ balanceCents: sql`${users.balanceCents} + ${totalCents}` })
      .where(eq(users.id, payment.userId))
      .returning({ balanceCents: users.balanceCents });

    await tx.insert(transactions).values({
      userId: payment.userId,
      type: "topup",
      amountCents: payment.amountCents,
      description: `Wallet top-up · Paystack · ${payment.currency}`,
      reference: payment.reference,
    });

    if (payment.bonusCents > 0) {
      await tx.insert(transactions).values({
        userId: payment.userId,
        type: "bonus",
        amountCents: payment.bonusCents,
        description: "10% bulk top-up bonus",
        reference: `${payment.reference}-BONUS`,
      });
    }

    return {
      ok: true as const,
      alreadyFulfilled: false,
      balanceCents: updatedUser?.balanceCents ?? 0,
      bonusCents: payment.bonusCents,
      amountCents: payment.amountCents,
    };
  });
}
