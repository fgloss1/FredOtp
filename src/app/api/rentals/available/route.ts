import { NextResponse } from "next/server";
import { db } from "@/db";
import { phoneNumbers, countries } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const available = await db.select({
      id: phoneNumbers.id,
      number: phoneNumbers.number,
      country: countries.name,
      monthlyPrice: phoneNumbers.monthlyPrice,
    }).from(phoneNumbers).innerJoin(countries, eq(phoneNumbers.countryId, countries.id)).where(eq(phoneNumbers.status, "available"));
    return NextResponse.json({ numbers: available });
  } catch {
    return NextResponse.json({ numbers: [] });
  }
}