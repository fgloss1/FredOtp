import { NextResponse } from "next/server";
import { db } from "@/db";
import { phoneNumbers } from "@/db/schema";

export async function GET() {
  try {
    const numbers = await db.select().from(phoneNumbers);
    return NextResponse.json({ numbers });
  } catch {
    return NextResponse.json({ numbers: [] });
  }
}