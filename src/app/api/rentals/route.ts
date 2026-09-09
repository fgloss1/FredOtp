import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getUserRentals } from "@/lib/queries";
import { createRental, syncActiveRentals } from "@/lib/rental-engine";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  try {
    await syncActiveRentals(user.id);
    const [fresh] = await db
      .select({ balanceCents: users.balanceCents })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);
    const rentals = await getUserRentals(user.id);
    return Response.json({ rentals, balanceCents: fresh?.balanceCents ?? user.balanceCents });
  } catch (error) {
    console.error("Rental list sync error", error);
    return Response.json({ error: "Could not load rentals right now. Please try again." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: { serviceId?: number; countryId?: number };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const serviceId = Number(body.serviceId);
  const countryId = Number(body.countryId);
  if (!Number.isInteger(serviceId) || !Number.isInteger(countryId)) {
    return Response.json({ error: "Pick a service and a country." }, { status: 400 });
  }

  try {
    const result = await createRental(user.id, serviceId, countryId);
    if (!result.ok) return Response.json({ error: result.error }, { status: 400 });

    return Response.json({ rental: result.rental, balanceCents: result.balanceCents });
  } catch (error) {
    console.error("Rental creation error", error);
    return Response.json(
      { error: "The OTP suppliers are temporarily unavailable. Please try again." },
      { status: 503 },
    );
  }
}
