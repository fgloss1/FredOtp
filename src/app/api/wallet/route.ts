import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getWallet } from "@/lib/wallet";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const { user } = await requireAuth();
    const wallet = await getWallet(user.id);
    const txs = await db.select().from(transactions).where(eq(transactions.walletId, wallet.id)).orderBy(desc(transactions.createdAt)).limit(20);
    return NextResponse.json({ balance: wallet.balance, currency: wallet.currency, transactions: txs });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}