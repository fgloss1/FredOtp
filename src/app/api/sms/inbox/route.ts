import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { smsMessages } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    await requireAuth();
    const messages = await db.select().from(smsMessages).orderBy(desc(smsMessages.createdAt)).limit(50);
    return NextResponse.json({ messages });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}