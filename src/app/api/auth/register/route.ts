import { eq } from "drizzle-orm";
import { db } from "@/db";
import { transactions, users } from "@/db/schema";
import { createSession, hashPassword } from "@/lib/auth";
import { reference } from "@/lib/rental-engine";

export const dynamic = "force-dynamic";

const WELCOME_BONUS_CENTS = 100;

export async function POST(request: Request) {
  let body: { name?: string; email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  if (name.length < 2) return Response.json({ error: "Enter your full name." }, { status: 400 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < 8) {
    return Response.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) {
    return Response.json({ error: "An account with that email already exists." }, { status: 409 });
  }

  const [created] = await db
    .insert(users)
    .values({
      email,
      name,
      passwordHash: hashPassword(password),
      balanceCents: WELCOME_BONUS_CENTS,
    })
    .returning({ id: users.id, name: users.name, email: users.email });

  await db.insert(transactions).values({
    userId: created.id,
    type: "bonus",
    amountCents: WELCOME_BONUS_CENTS,
    description: "Welcome bonus credit",
    reference: reference("BON"),
  });

  await createSession(created.id);
  return Response.json({ user: created });
}
