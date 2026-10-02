import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { generateApiKey } from "@/lib/api-key";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const { user } = await requireAuth();
    const keys = await db.select().from(apiKeys).where(eq(apiKeys.userId, user.id)).orderBy(desc(apiKeys.createdAt));
    return NextResponse.json({ keys });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAuth();
    const { name } = await request.json();
    const { rawKey, keyPrefix, keyHash } = generateApiKey();

    const [newKey] = await db.insert(apiKeys).values({
      userId: user.id,
      name: name || "Production Key",
      keyHash,
      keyPrefix,
      isActive: true,
    }).returning();

    return NextResponse.json({ key: { ...newKey, rawKey } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to generate key" }, { status: 500 });
  }
}