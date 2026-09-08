import { randomBytes } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { countries, offers, rentals, services, transactions, users } from "@/db/schema";
import {
  RENTAL_WINDOW_MINUTES,
  deliveryDelaySeconds,
  generateOtpCode,
  generatePhoneNumber,
  renderSms,
} from "@/lib/otp";
import type { RentalView } from "@/lib/queries";

export function reference(prefix: string): string {
  return `${prefix}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

export async function getRentalView(rentalId: number, userId: number): Promise<RentalView | null> {
  const rows = await db
    .select({
      id: rentals.id,
      status: rentals.status,
      phoneNumber: rentals.phoneNumber,
      priceCents: rentals.priceCents,
      otpCode: rentals.otpCode,
      smsText: rentals.smsText,
      createdAt: rentals.createdAt,
      expiresAt: rentals.expiresAt,
      serviceName: services.name,
      serviceIcon: services.icon,
      serviceSlug: services.slug,
      countryName: countries.name,
      countryFlag: countries.flag,
    })
    .from(rentals)
    .innerJoin(services, eq(services.id, rentals.serviceId))
    .innerJoin(countries, eq(countries.id, rentals.countryId))
    .where(and(eq(rentals.id, rentalId), eq(rentals.userId, userId)))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  return { ...row, createdAt: row.createdAt.toISOString(), expiresAt: row.expiresAt.toISOString() };
}

type CreateResult =
  | { ok: true; rental: RentalView; balanceCents: number }
  | { ok: false; error: string };

export async function createRental(
  userId: number,
  serviceId: number,
  countryId: number,
): Promise<CreateResult> {
  const outcome = await db.transaction(async (tx) => {
    const [offer] = await tx
      .select({
        priceCents: offers.priceCents,
        stock: offers.stock,
        pattern: countries.numberPattern,
        smsTemplate: services.smsTemplate,
      })
      .from(offers)
      .innerJoin(countries, eq(countries.id, offers.countryId))
      .innerJoin(services, eq(services.id, offers.serviceId))
      .where(and(eq(offers.serviceId, serviceId), eq(offers.countryId, countryId)))
      .limit(1);

    if (!offer) return { ok: false as const, error: "That service is not available in this country." };
    if (offer.stock <= 0) return { ok: false as const, error: "No numbers left in this pool. Try another country." };

    const [user] = await tx
      .select({ balanceCents: users.balanceCents })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) return { ok: false as const, error: "Account not found." };
    if (user.balanceCents < offer.priceCents) {
      return { ok: false as const, error: "Insufficient wallet balance. Please top up." };
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + RENTAL_WINDOW_MINUTES * 60 * 1000);
    const phoneNumber = generatePhoneNumber(offer.pattern);

    const [created] = await tx
      .insert(rentals)
      .values({
        userId,
        serviceId,
        countryId,
        phoneNumber,
        priceCents: offer.priceCents,
        status: "waiting",
        deliverAfterSeconds: deliveryDelaySeconds(),
        expiresAt,
      })
      .returning({ id: rentals.id });

    const [updatedUser] = await tx
      .update(users)
      .set({ balanceCents: sql`${users.balanceCents} - ${offer.priceCents}` })
      .where(eq(users.id, userId))
      .returning({ balanceCents: users.balanceCents });

    await tx
      .update(offers)
      .set({ stock: sql`greatest(${offers.stock} - 1, 0)` })
      .where(and(eq(offers.serviceId, serviceId), eq(offers.countryId, countryId)));

    await tx.insert(transactions).values({
      userId,
      type: "purchase",
      amountCents: -offer.priceCents,
      description: `Number rental · ${phoneNumber}`,
      reference: reference("RNT"),
    });

    return {
      ok: true as const,
      rentalId: created.id,
      balanceCents: updatedUser.balanceCents,
    };
  });

  if (!outcome.ok) return outcome;

  const view = await getRentalView(outcome.rentalId, userId);
  if (!view) return { ok: false as const, error: "Could not create rental." };
  return { ok: true as const, rental: view, balanceCents: outcome.balanceCents };
}

/** Advances a waiting rental: delivers the SMS or expires + refunds it. */
export async function syncRental(rentalId: number, userId: number): Promise<RentalView | null> {
  await db.transaction(async (tx) => {
    const [rental] = await tx
      .select()
      .from(rentals)
      .where(and(eq(rentals.id, rentalId), eq(rentals.userId, userId)))
      .limit(1);

    if (!rental || rental.status !== "waiting") return;

    const now = Date.now();
    const deliverAt = rental.createdAt.getTime() + rental.deliverAfterSeconds * 1000;

    if (now >= deliverAt && now < rental.expiresAt.getTime()) {
      const [service] = await tx
        .select({ smsTemplate: services.smsTemplate })
        .from(services)
        .where(eq(services.id, rental.serviceId))
        .limit(1);
      const code = generateOtpCode();
      await tx
        .update(rentals)
        .set({
          status: "received",
          otpCode: code,
          smsText: renderSms(service?.smsTemplate ?? "Your code is {code}", code),
          receivedAt: new Date(),
        })
        .where(eq(rentals.id, rentalId));
      return;
    }

    if (now >= rental.expiresAt.getTime()) {
      await tx.update(rentals).set({ status: "expired" }).where(eq(rentals.id, rentalId));
      await tx
        .update(users)
        .set({ balanceCents: sql`${users.balanceCents} + ${rental.priceCents}` })
        .where(eq(users.id, userId));
      await tx.insert(transactions).values({
        userId,
        type: "refund",
        amountCents: rental.priceCents,
        description: `Auto refund · no SMS on ${rental.phoneNumber}`,
        reference: reference("REF"),
      });
    }
  });

  return getRentalView(rentalId, userId);
}

export async function cancelRental(
  rentalId: number,
  userId: number,
): Promise<{ ok: boolean; error?: string }> {
  return db.transaction(async (tx) => {
    const [rental] = await tx
      .select()
      .from(rentals)
      .where(and(eq(rentals.id, rentalId), eq(rentals.userId, userId)))
      .limit(1);

    if (!rental) return { ok: false, error: "Rental not found." };
    if (rental.status !== "waiting") return { ok: false, error: "This rental can no longer be cancelled." };

    await tx.update(rentals).set({ status: "cancelled" }).where(eq(rentals.id, rentalId));
    await tx
      .update(users)
      .set({ balanceCents: sql`${users.balanceCents} + ${rental.priceCents}` })
      .where(eq(users.id, userId));
    await tx.insert(transactions).values({
      userId,
      type: "refund",
      amountCents: rental.priceCents,
      description: `Refund · cancelled ${rental.phoneNumber}`,
      reference: reference("REF"),
    });
    await tx
      .update(offers)
      .set({ stock: sql`${offers.stock} + 1` })
      .where(and(eq(offers.serviceId, rental.serviceId), eq(offers.countryId, rental.countryId)));

    return { ok: true };
  });
}

export async function syncActiveRentals(userId: number): Promise<void> {
  const waiting = await db
    .select({ id: rentals.id })
    .from(rentals)
    .where(and(eq(rentals.userId, userId), eq(rentals.status, "waiting")));
  for (const row of waiting) {
    await syncRental(row.id, userId);
  }
}
