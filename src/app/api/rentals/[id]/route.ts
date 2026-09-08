import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { cancelRental, getRentalView, syncRental } from "@/lib/rental-engine";

export const dynamic = "force-dynamic";

async function balanceOf(userId: number): Promise<number> {
  const [row] = await db
    .select({ balanceCents: users.balanceCents })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row?.balanceCents ?? 0;
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  const { id } = await context.params;
  const rentalId = Number(id);
  if (!Number.isInteger(rentalId)) return Response.json({ error: "Bad id." }, { status: 400 });

  try {
    const rental = await syncRental(rentalId, user.id);
    if (!rental) return Response.json({ error: "Rental not found." }, { status: 404 });

    return Response.json({ rental, balanceCents: await balanceOf(user.id) });
  } catch (error) {
    console.error("Rental detail sync error", error);
    return Response.json({ error: "Could not load this rental right now. Please try again." }, { status: 503 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  const { id } = await context.params;
  const rentalId = Number(id);
  if (!Number.isInteger(rentalId)) return Response.json({ error: "Bad id." }, { status: 400 });

  try {
    const result = await cancelRental(rentalId, user.id);
    if (!result.ok) return Response.json({ error: result.error }, { status: 400 });

    const rental = await getRentalView(rentalId, user.id);
    if (!rental) return Response.json({ error: "Rental no longer exists." }, { status: 404 });

    return Response.json({ rental, balanceCents: await balanceOf(user.id) });
  } catch (error) {
    console.error("Rental cancellation error", error);
    return Response.json({ error: "Could not cancel this rental right now. Please try again." }, { status: 503 });
  }
}
