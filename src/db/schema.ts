import {
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    username: varchar("username", { length: 32 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    balanceCents: integer("balance_cents").notNull().default(0),
    isAdmin: boolean("is_admin").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("users_username_unique").on(table.username),
    uniqueIndex("users_email_unique").on(table.email),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("sessions_user_idx").on(table.userId)],
);

export const countries = pgTable(
  "countries",
  {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 8 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    dialCode: varchar("dial_code", { length: 8 }).notNull(),
    flag: varchar("flag", { length: 16 }).notNull(),
    numberPattern: varchar("number_pattern", { length: 40 }).notNull(),
    multiplierBp: integer("multiplier_bp").notNull().default(10000),
    region: varchar("region", { length: 60 }).notNull().default("Global"),
    active: boolean("active").notNull().default(true),
  },
  (table) => [uniqueIndex("countries_code_unique").on(table.code)],
);

export const services = pgTable(
  "services",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 80 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    category: varchar("category", { length: 60 }).notNull(),
    icon: varchar("icon", { length: 16 }).notNull().default("ðŸ“±"),
    accent: varchar("accent", { length: 24 }).notNull().default("#38bdf8"),
    basePriceCents: integer("base_price_cents").notNull(),
    smsTemplate: text("sms_template").notNull(),
    popular: boolean("popular").notNull().default(false),
    active: boolean("active").notNull().default(true),
  },
  (table) => [uniqueIndex("services_slug_unique").on(table.slug)],
);

export const offers = pgTable(
  "offers",
  {
    id: serial("id").primaryKey(),
    serviceId: integer("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    countryId: integer("country_id")
      .notNull()
      .references(() => countries.id, { onDelete: "cascade" }),
    priceCents: integer("price_cents").notNull(),
    stock: integer("stock").notNull().default(0),
    successRate: integer("success_rate").notNull().default(95),
  },
  (table) => [
    uniqueIndex("offers_service_country_unique").on(table.serviceId, table.countryId),
    index("offers_country_idx").on(table.countryId),
  ],
);

export const rentals = pgTable(
  "rentals",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    serviceId: integer("service_id")
      .notNull()
      .references(() => services.id),
    countryId: integer("country_id")
      .notNull()
      .references(() => countries.id),
    phoneNumber: varchar("phone_number", { length: 32 }).notNull(),
    priceCents: integer("price_cents").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("waiting"),
    otpCode: varchar("otp_code", { length: 12 }),
    smsText: text("sms_text"),
    deliverAfterSeconds: integer("deliver_after_seconds").notNull().default(12),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }),
  },
  (table) => [index("rentals_user_idx").on(table.userId, table.createdAt)],
);

export const payments = pgTable(
  "payments",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reference: varchar("reference", { length: 80 }).notNull(),
    provider: varchar("provider", { length: 32 }).notNull().default("paystack"),
    method: varchar("method", { length: 32 }).notNull(),
    amountCents: integer("amount_cents").notNull(),
    bonusCents: integer("bonus_cents").notNull().default(0),
    providerAmountMinor: integer("provider_amount_minor").notNull(),
    currency: varchar("currency", { length: 8 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    providerTransactionId: varchar("provider_transaction_id", { length: 80 }),
    authorizationUrl: text("authorization_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("payments_reference_unique").on(table.reference),
    index("payments_user_idx").on(table.userId, table.createdAt),
  ],
);

export const transactions = pgTable(
  "transactions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 20 }).notNull(),
    amountCents: integer("amount_cents").notNull(),
    description: text("description").notNull(),
    reference: varchar("reference", { length: 80 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("transactions_reference_unique").on(table.reference),
    index("transactions_user_idx").on(table.userId, table.createdAt),
  ],
);

export type User = typeof users.$inferSelect;
export type Country = typeof countries.$inferSelect;
export type Service = typeof services.$inferSelect;
export type Offer = typeof offers.$inferSelect;
export type Rental = typeof rentals.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;

export type Payment = typeof payments.$inferSelect;

