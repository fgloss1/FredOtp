import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/db";
import { phoneNumbers } from "@/db/schema";

export async function GET() {
  try {
    await requireAdmin();

    const numbers = await db.select().from(phoneNumbers);

    return NextResponse.json({ numbers });
  } catch {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
}