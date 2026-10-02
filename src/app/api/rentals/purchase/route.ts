import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { deductBalance } from "@/lib/wallet";
import { db } from "@/db";
import { phoneNumbers, rentals, subscriptions, orders } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAuth();
    const { phoneNumberId } = await request.json();

    const [phoneNumber] = await db.select().from(phoneNumbers).where(eq(phoneNumbers.id, phoneNumberId)).limit(1);
    if (!phoneNumber || phoneNumber.status !== "available") return NextResponse.json({ error: "Unavailable" }, { status: 400 });

    const price = parseFloat(phoneNumber.monthlyPrice);
    await deductBalance(user.id, price, `Rental: ${phoneNumber.number}`, "rental_payment");

    const now = new Date();
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + 1);

    const [rental] = await db.insert(rentals).values({
      userId: user.id,
      phoneNumberId: phoneNumber.id,
      status: "active",
      startDate: now,
      endDate,
      autoRenew: true,
      monthlyPrice: phoneNumber.monthlyPrice,
    }).returning();

    await db.insert(subscriptions).values({
      userId: user.id,
      rentalId: rental.id,
      status: "active",
      currentPeriodStart: now,
      currentPeriodEnd: endDate,
      nextRenewalDate: endDate,
    });

    await db.insert(orders).values({
      userId: user.id,
      rentalId: rental.id,
      status: "completed",
      totalAmount: phoneNumber.monthlyPrice,
      description: `Phone rental: ${phoneNumber.number}`,
    });

    await db.update(phoneNumbers).set({ status: "assigned", assignedUserId: user.id }).where(eq(phoneNumbers.id, phoneNumber.id));

    return NextResponse.json({ message: "Rented successfully", rental });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Purchase failed" }, { status: 400 });
  }
}