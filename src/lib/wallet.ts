import { db } from "@/db";
import { wallets, transactions } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function getWallet(userId: string) {
  const result = await db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);

  if (result.length === 0) {
    const newWallet = await db
      .insert(wallets)
      .values({ userId, balance: "0.00", currency: "USD" })
      .returning();
    return newWallet[0];
  }
  return result[0];
}

export async function getBalance(userId: string): Promise<number> {
  const wallet = await getWallet(userId);
  return parseFloat(wallet.balance);
}

export async function deductBalance(
  userId: string,
  amount: number,
  description: string,
  type: "rental_payment" | "rental_renewal" | "sms_purchase" | "otp_purchase" = "rental_payment"
) {
  const wallet = await getWallet(userId);
  const currentBalance = parseFloat(wallet.balance);

  if (currentBalance < amount) {
    throw new Error("Insufficient balance");
  }

  await db
    .update(wallets)
    .set({
      balance: sql`${wallets.balance} - ${amount}`,
      updatedAt: new Date(),
    })
    .where(eq(wallets.id, wallet.id));

  const tx = await db
    .insert(transactions)
    .values({
      userId,
      walletId: wallet.id,
      type,
      amount: amount.toFixed(2),
      status: "completed",
      description,
    })
    .returning();

  return tx[0];
}

export async function addBalance(userId: string, amount: number, description: string) {
  const wallet = await getWallet(userId);

  await db
    .update(wallets)
    .set({
      balance: sql`${wallets.balance} + ${amount}`,
      updatedAt: new Date(),
    })
    .where(eq(wallets.id, wallet.id));

  const tx = await db
    .insert(transactions)
    .values({
      userId,
      walletId: wallet.id,
      type: "deposit",
      amount: amount.toFixed(2),
      status: "completed",
      description,
    })
    .returning();

  return tx[0];
}