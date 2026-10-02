import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, sessions, wallets } from "@/db/schema";
import { hashPassword } from "@/lib/password";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { email, password, firstName, lastName } = await request.json();
    if (!email || !password) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const existing = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);
    if (existing.length > 0) return NextResponse.json({ error: "Account exists" }, { status: 400 });

    const passwordHash = await hashPassword(password);
    const [newUser] = await db.insert(users).values({
      email: email.toLowerCase().trim(),
      passwordHash,
      firstName,
      lastName,
      role: "customer",
    }).returning();

    await db.insert(wallets).values({ userId: newUser.id, balance: "0.00", currency: "USD" });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db.insert(sessions).values({ userId: newUser.id, token, expiresAt });

    const response = NextResponse.json({ message: "Registered", user: newUser }, { status: 201 });
    response.cookies.set({ name: "session_token", value: token, httpOnly: true, path: "/", expires: expiresAt });
    return response;
  } catch (err) {
    return NextResponse.json({ error: "Register error" }, { status: 500 });
  }
}