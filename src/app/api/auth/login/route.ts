import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, sessions } from "@/db/schema";
import { verifyPassword } from "@/lib/password";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    const [u] = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);
    if (!u || !(await verifyPassword(password, u.passwordHash))) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db.insert(sessions).values({ userId: u.id, token, expiresAt });

    const res = NextResponse.json({
      success: true,
      user: {
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
      },
    });
    res.cookies.set({ name: "session_token", value: token, httpOnly: true, path: "/", expires: expiresAt });
    return res;
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}