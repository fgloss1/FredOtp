import { randomBytes } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { countries, offers, rentals, services, transactions, users } from "@/db/schema";
import { RENTAL_WINDOW_MINUTES, renderSms } from "@/lib/otp";
import { getProvider, getProviderQuotes } from "@/lib/providers/router";
import { customerPriceForProviderCost } from "@/lib/providers/pricing";
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
      countryCode: countries.code,
      countryFlag: countries.flag,
    })
    .from(rentals)
    .innerJoin(services, eq(services.id, rentals.serviceId))
    .innerJoin(countries, eq(countries.id, rentals.countryId))
    .where(and(eq(rentals.id, rentalId), eq(rentals.userId, userId)))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
  };
}

type CreateResult =
  | { ok: true; rental: RentalView; balanceCents: number }
  | { ok: false; error: string };

const CUSTOMER_UNAVAILABLE_ERROR =
  "This number is temporarily unavailable. Please try another service or country.";
const CUSTOMER_RETRY_ERROR =
  "We could not secure a number right now. Please try again or choose another option.";

async function refundFailedRental(rentalId: number, userId: number): Promise<void> {
  await db.transaction(async (tx) => {
    const [current] = await tx
      .select({ status: rentals.status, priceCents: rentals.priceCents, phoneNumber: rentals.phoneNumber })
      .from(rentals)
      .where(and(eq(rentals.id, rentalId), eq(rentals.userId, userId), eq(rentals.status, "waiting")))
      .limit(1);

    if (!current) return;

    await tx.update(rentals).set({ status: "expired" }).where(eq(rentals.id, rentalId));
    await tx
      .update(users)
      .set({ balanceCents: sql`${users.balanceCents} + ${current.priceCents}` })
      .where(eq(users.id, userId));
    await tx.insert(transactions).values({
      userId,
      type: "refund",
      amountCents: current.priceCents,
      description: `Refund · failed rental ${current.phoneNumber}`,
      reference: reference("REF"),
    });
  });
}

export async function createRental(
  userId: number,
  serviceId: number,
  countryId: number,
): Promise<CreateResult> {
  const [serviceRow] = await db
    .select({
      id: services.id,
      slug: services.slug,
      name: services.name,
      basePriceCents: services.basePriceCents,
      active: services.active,
    })
    .from(services)
    .where(and(eq(services.id, serviceId), eq(services.active, true)))
    .limit(1);

  if (!serviceRow) return { ok: false, error: CUSTOMER_UNAVAILABLE_ERROR };

  const [country] = await db
    .select({ id: countries.id, code: countries.code, active: countries.active })
    .from(countries)
    .where(and(eq(countries.id, countryId), eq(countries.active, true)))
    .limit(1);

  if (!country) return { ok: false, error: CUSTOMER_UNAVAILABLE_ERROR };

  const [offer] = await db
    .select({ priceCents: offers.priceCents })
    .from(offers)
    .where(and(eq(offers.serviceId, serviceId), eq(offers.countryId, countryId)))
    .limit(1);

  const basePriceCents = offer?.priceCents ?? serviceRow.basePriceCents;

  const [user] = await db
    .select({ balanceCents: users.balanceCents })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return { ok: false, error: "Account not found." };

  let quotes;
  try {
    quotes = await getProviderQuotes({
      countryCode: country.code,
      serviceSlug: serviceRow.slug,
    });
  } catch (error) {
    console.error("Supplier availability check failed", error);
    return { ok: false, error: CUSTOMER_UNAVAILABLE_ERROR };
  }

  if (quotes.length === 0) {
    return { ok: false, error: CUSTOMER_UNAVAILABLE_ERROR };
  }

  let lastError: unknown = null;

  for (const quote of quotes) {
    if (quote.costCents == null) continue;

    const customerPriceCents = customerPriceForProviderCost(quote.costCents, basePriceCents);
    if (user.balanceCents < customerPriceCents) {
      return {
        ok: false,
        error: `Insufficient wallet balance. The current price is ${customerPriceCents / 100 >= 1 ? `$${(customerPriceCents / 100).toFixed(2)}` : `${customerPriceCents}¢`}.`,
      };
    }

    const provider = getProvider(quote.provider);

    try {
      const providerOrder = await provider.buy({
        countryCode: country.code,
        serviceSlug: serviceRow.slug,
        maxCostCents: quote.costCents,
      });

      const finalCustomerPriceCents = customerPriceForProviderCost(
        providerOrder.costCents,
        basePriceCents,
      );

      if (user.balanceCents < finalCustomerPriceCents) {
        try {
          await provider.cancel(providerOrder.orderId);
        } catch {
          // Best-effort supplier cleanup.
        }
        return {
          ok: false,
          error: "Your wallet balance is too low for the supplier price returned at purchase time.",
        };
      }

      const outcome = await db.transaction(async (tx) => {
        const [updatedUser] = await tx
          .update(users)
          .set({ balanceCents: sql`${users.balanceCents} - ${finalCustomerPriceCents}` })
          .where(and(eq(users.id, userId), sql`${users.balanceCents} >= ${finalCustomerPriceCents}`))
          .returning({ balanceCents: users.balanceCents });

        if (!updatedUser) {
          return { ok: false as const, error: "Your wallet balance changed. Please try again." };
        }

        const now = new Date();
        const expiresAt = new Date(now.getTime() + RENTAL_WINDOW_MINUTES * 60 * 1000);

        const [created] = await tx
          .insert(rentals)
          .values({
            userId,
            serviceId,
            countryId,
            phoneNumber: providerOrder.phoneNumber,
            priceCents: finalCustomerPriceCents,
            status: "waiting",
            deliverAfterSeconds: 0,
            expiresAt,
            provider: providerOrder.provider,
            providerOrderId: providerOrder.orderId,
            providerCostMinor: providerOrder.costCents,
            providerCostCurrency: providerOrder.currency,
            providerStatus: providerOrder.status,
          })
          .returning({ id: rentals.id });

        await tx.insert(transactions).values({
          userId,
          type: "purchase",
          amountCents: -finalCustomerPriceCents,
          description: `Number rental · ${providerOrder.phoneNumber}`,
          reference: reference("RNT"),
        });

        return {
          ok: true as const,
          rentalId: created.id,
          balanceCents: updatedUser.balanceCents,
        };
      });

      if (!outcome.ok) {
        try {
          await provider.cancel(providerOrder.orderId);
        } catch {
          // Best-effort supplier cleanup.
        }
        return outcome;
      }

      const view = await getRentalView(outcome.rentalId, userId);
      if (!view) {
        try {
          await provider.cancel(providerOrder.orderId);
        } catch {
          // Best-effort supplier cleanup.
        }
        await refundFailedRental(outcome.rentalId, userId);
        return { ok: false, error: CUSTOMER_RETRY_ERROR };
      }

      return { ok: true, rental: view, balanceCents: outcome.balanceCents };
    } catch (error) {
      const detail = error instanceof Error ? error.message.trim() : "Unknown supplier error.";
      lastError = new Error(`${provider.name}: ${detail || "Unknown supplier error."}`);
    }
  }

  if (lastError instanceof Error) {
    console.error("All supplier purchase attempts failed", lastError);
  }
  return { ok: false, error: CUSTOMER_RETRY_ERROR };
}

function providerStatusToRentalStatus(status: string): "waiting" | "received" | "cancelled" | "expired" {
  switch (status.toUpperCase()) {
    case "RECEIVED":
    case "FINISHED":
      return "received";
    case "CANCELED":
      return "cancelled";
    case "TIMEOUT":
    case "BANNED":
      return "expired";
    default:
      return "waiting";
  }
}

async function refundRental(rentalId: number, userId: number, description: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [rental] = await tx
      .select({ status: rentals.status, priceCents: rentals.priceCents })
      .from(rentals)
      .where(and(eq(rentals.id, rentalId), eq(rentals.userId, userId)))
      .limit(1);

    if (!rental || (rental.status !== "waiting" && rental.status !== "cancelled")) return;

    await tx.update(rentals).set({ status: "expired" }).where(eq(rentals.id, rentalId));
    await tx.update(users).set({ balanceCents: sql`${users.balanceCents} + ${rental.priceCents}` }).where(eq(users.id, userId));
    await tx.insert(transactions).values({
      userId,
      type: "refund",
      amountCents: rental.priceCents,
      description,
      reference: reference("REF"),
    });
  });
}

export async function syncRental(rentalId: number, userId: number): Promise<RentalView | null> {
  const [rental] = await db
    .select()
    .from(rentals)
    .where(and(eq(rentals.id, rentalId), eq(rentals.userId, userId)))
    .limit(1);

  if (!rental || rental.status !== "waiting") return getRentalView(rentalId, userId);
  if (!rental.provider || !rental.providerOrderId) return getRentalView(rentalId, userId);

  const provider = getProvider(rental.provider);

  try {
    const result = await provider.check(rental.providerOrderId);
    const mapped = providerStatusToRentalStatus(result.status);

    if (mapped === "received" && result.sms) {
      const [service] = await db
        .select({ smsTemplate: services.smsTemplate })
        .from(services)
        .where(eq(services.id, rental.serviceId))
        .limit(1);

      const code = result.sms.code;
      const smsText = result.sms.text ?? (code ? renderSms(service?.smsTemplate ?? "Your code is {code}", code) : null);

      if (code || smsText) {
        await db
          .update(rentals)
          .set({
            status: "received",
            otpCode: code,
            smsText,
            receivedAt: new Date(),
            providerStatus: result.status,
          })
          .where(and(eq(rentals.id, rentalId), eq(rentals.status, "waiting")));

        if (provider.finish) {
          try {
            await provider.finish(rental.providerOrderId);
          } catch {
            // SMS has already been received; finishing is best effort.
          }
        }
      }
    } else if (mapped === "cancelled" || mapped === "expired" || Date.now() >= rental.expiresAt.getTime()) {
      if (Date.now() >= rental.expiresAt.getTime()) {
        try {
          await provider.cancel(rental.providerOrderId);
        } catch {
          // Provider may already have expired the order.
        }
      }

      await refundRental(rentalId, userId, `Auto refund · no SMS on ${rental.phoneNumber}`);
    } else {
      await db
        .update(rentals)
        .set({ providerStatus: result.status })
        .where(eq(rentals.id, rentalId));
    }
  } catch {
    // Transient provider errors leave the rental waiting for the next sync attempt.
  }

  return getRentalView(rentalId, userId);
}

export async function cancelRental(
  rentalId: number,
  userId: number,
): Promise<{ ok: boolean; error?: string }> {
  const [rental] = await db
    .select()
    .from(rentals)
    .where(and(eq(rentals.id, rentalId), eq(rentals.userId, userId)))
    .limit(1);

  if (!rental) return { ok: false, error: "Rental not found." };
  if (rental.status !== "waiting") return { ok: false, error: "This rental can no longer be cancelled." };

  if (rental.provider && rental.providerOrderId) {
    try {
      await getProvider(rental.provider).cancel(rental.providerOrderId);
    } catch {
      return { ok: false, error: "The supplier could not cancel this number yet. Please try again." };
    }
  }

  await db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(rentals)
      .where(and(eq(rentals.id, rentalId), eq(rentals.userId, userId), eq(rentals.status, "waiting")))
      .limit(1);

    if (!current) return;

    await tx.update(rentals).set({ status: "cancelled", providerStatus: "CANCELED" }).where(eq(rentals.id, rentalId));
    await tx.update(users).set({ balanceCents: sql`${users.balanceCents} + ${current.priceCents}` }).where(eq(users.id, userId));
    await tx.insert(transactions).values({
      userId,
      type: "refund",
      amountCents: current.priceCents,
      description: `Refund · cancelled ${current.phoneNumber}`,
      reference: reference("REF"),
    });
  });

  return { ok: true };
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
