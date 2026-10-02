import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { rentals, phoneNumbers, countries } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const { user } = await requireAuth();
    const myRentals = await db.select({
      id: rentals.id,
      status: rentals.status,
      monthlyPrice: rentals.monthlyPrice,
      number: phoneNumbers.number,
      country: countries.name,
    }).from(rentals).innerJoin(phoneNumbers, eq(rentals.phoneNumberId, phoneNumbers.id)).innerJoin(countries, eq(phoneNumbers.countryId, countries.id)).where(eq(rentals.userId, user.id));
    return NextResponse.json({ rentals: myRentals });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}