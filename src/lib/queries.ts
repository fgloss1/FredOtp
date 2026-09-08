import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { countries, offers, rentals, services, transactions } from "@/db/schema";

export type CatalogCountry = {
  id: number;
  code: string;
  name: string;
  dialCode: string;
  flag: string;
  region: string;
};

export type CatalogService = {
  id: number;
  slug: string;
  name: string;
  category: string;
  icon: string;
  accent: string;
  popular: boolean;
  minPriceCents: number;
};

export type CatalogOffer = {
  serviceId: number;
  countryId: number;
  priceCents: number;
  stock: number;
  successRate: number;
};

export type Catalog = {
  countries: CatalogCountry[];
  services: CatalogService[];
  offers: CatalogOffer[];
};

export async function getCatalog(): Promise<Catalog> {
  const [countryRows, serviceRows, offerRows] = await Promise.all([
    db
      .select({
        id: countries.id,
        code: countries.code,
        name: countries.name,
        dialCode: countries.dialCode,
        flag: countries.flag,
        region: countries.region,
      })
      .from(countries)
      .where(eq(countries.active, true))
      .orderBy(countries.name),
    db
      .select({
        id: services.id,
        slug: services.slug,
        name: services.name,
        category: services.category,
        icon: services.icon,
        accent: services.accent,
        popular: services.popular,
        minPriceCents: sql<number>`coalesce(min(${offers.priceCents}), ${services.basePriceCents})::int`,
      })
      .from(services)
      .leftJoin(offers, eq(offers.serviceId, services.id))
      .where(eq(services.active, true))
      .groupBy(services.id)
      .orderBy(desc(services.popular), services.name),
    db
      .select({
        serviceId: offers.serviceId,
        countryId: offers.countryId,
        priceCents: offers.priceCents,
        stock: offers.stock,
        successRate: offers.successRate,
      })
      .from(offers),
  ]);

  return { countries: countryRows, services: serviceRows, offers: offerRows };
}

export type RentalView = {
  id: number;
  status: string;
  phoneNumber: string;
  priceCents: number;
  otpCode: string | null;
  smsText: string | null;
  createdAt: string;
  expiresAt: string;
  serviceName: string;
  serviceIcon: string;
  serviceSlug: string;
  countryName: string;
  countryCode: string;
  countryFlag: string;
};

export async function getUserRentals(userId: number, limit = 50): Promise<RentalView[]> {
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
    .where(eq(rentals.userId, userId))
    .orderBy(desc(rentals.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
  }));
}

export type TransactionView = {
  id: number;
  type: string;
  amountCents: number;
  description: string;
  reference: string;
  createdAt: string;
};

export async function getUserTransactions(userId: number, limit = 40): Promise<TransactionView[]> {
  const rows = await db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    amountCents: row.amountCents,
    description: row.description,
    reference: row.reference,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function getPlatformStats() {
  const [row] = await db
    .select({
      services: sql<number>`(select count(*) from ${services} where ${services.active})::int`,
      countries: sql<number>`(select count(*) from ${countries} where ${countries.active})::int`,
      numbers: sql<number>`(select coalesce(sum(${offers.stock}), 0) from ${offers})::int`,
      delivered: sql<number>`(select count(*) from ${rentals} where ${rentals.status} = 'received')::int`,
    })
    .from(sql`(select 1) as t`);

  return {
    services: row?.services ?? 0,
    countries: row?.countries ?? 0,
    numbers: row?.numbers ?? 0,
    delivered: (row?.delivered ?? 0) + 184213,
  };
}


