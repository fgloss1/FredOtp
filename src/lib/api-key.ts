import crypto from "crypto";
import { db } from "@/db";
import { apiKeys, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest } from "next/server";

export function generateApiKey() {
  const randomBytes = crypto.randomBytes(24).toString("hex");
  const rawKey = `nv_live_${randomBytes}`;
  const keyPrefix = rawKey.substring(0, 12);
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
  return { rawKey, keyPrefix, keyHash };
}

export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export async function authenticateApiKey(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const customHeader = request.headers.get("x-api-key");
  let apiKeyRaw = "";

  if (authHeader && authHeader.startsWith("Bearer ")) {
    apiKeyRaw = authHeader.replace("Bearer ", "").trim();
  } else if (customHeader) {
    apiKeyRaw = customHeader.trim();
  }

  if (!apiKeyRaw || !apiKeyRaw.startsWith("nv_live_")) return null;

  const keyHash = hashApiKey(apiKeyRaw);
  const result = await db
    .select({ apiKey: apiKeys, user: users })
    .from(apiKeys)
    .innerJoin(users, eq(apiKeys.userId, users.id))
    .where(and(eq(apiKeys.keyHash, keyHash), eq(apiKeys.isActive, true)))
    .limit(1);

  if (result.length === 0) return null;

  return { user: result[0].user, apiKey: result[0].apiKey };
}