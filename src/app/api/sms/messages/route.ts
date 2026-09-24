import { desc } from "drizzle-orm";
import { db } from "@/db";
import { smsMessages } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ error: "Sign in required." }, { status: 401 });
  }

  try {
    const messages = await db
      .select({
        id: smsMessages.id,
        messageId: smsMessages.messageId,
        fromNumber: smsMessages.fromNumber,
        toNumber: smsMessages.toNumber,
        text: smsMessages.text,
        otpCode: smsMessages.otpCode,
        receivedAt: smsMessages.receivedAt,
      })
      .from(smsMessages)
      .orderBy(desc(smsMessages.receivedAt))
      .limit(100);

    return Response.json({ messages });
  } catch (error) {
    console.error("SMS inbox load error", error);
    return Response.json(
      { error: "Could not load SMS messages right now." },
      { status: 503 }
    );
  }
}
