import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, hashPassword } from "@/lib/auth";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  let body: { username?: string; name?: string; email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const username = (body.username ?? "").trim().toLowerCase();
  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  if (!/^[a-z0-9_]{3,32}$/.test(username)) {
    return Response.json(
      { error: "Username must be 3-32 characters using letters, numbers, or underscores." },
      { status: 400 },
    );
  }  if (name.length < 2) return Response.json({ error: "Enter your full name." }, { status: 400 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < 8) {
    return Response.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const existingUsername = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (existingUsername.length > 0) {
    return Response.json({ error: "That username is already taken." }, { status: 409 });
  }

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length > 0) {
    return Response.json({ error: "An account with that email already exists." }, { status: 409 });
  }

  const [created] = await db
    .insert(users)
    .values({
      username,
      email,
      name,
      passwordHash: hashPassword(password),
      balanceCents: 0,
    })
    .returning({ id: users.id, username: users.username, name: users.name, email: users.email });
await createSession(created.id);
  return Response.json({ user: created });
}

