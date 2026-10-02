import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const { user } = await requireAuth();
    const userOrders = await db.select().from(orders).where(eq(orders.userId, user.id)).orderBy(desc(orders.createdAt)).limit(50);
    return NextResponse.json({ orders: userOrders });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}