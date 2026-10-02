import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { cookies } from "next/headers";

export async function getSession() {
  const cookieStore = cookies();
  const token = cookieStore.get("session_token")?.value;

  if (!token) return null;

  const result = await db
    .select({
      session: sessions,
      user: users,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
    .limit(1);

  if (result.length === 0) return null;

  return {
    session: result[0].session,
    user: result[0].user,
  };
}

export async function requireAuth() {
  const auth = await getSession();
  if (!auth) throw new Error("Unauthorized");
  return auth;
}

export async function requireAdmin() {
  const auth = await requireAuth();
  if (auth.user.role !== "admin") throw new Error("Forbidden");
  return auth;
}