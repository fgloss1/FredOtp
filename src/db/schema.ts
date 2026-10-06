import {
  pgTable,
  uuid,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  decimal,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const userRoleEnum = pgEnum("user_role", ["customer", "admin"]);
export const numberStatusEnum = pgEnum("number_status", ["available", "assigned", "suspended", "retired"]);
export const numberSourceEnum = pgEnum("number_source", ["telnyx", "tello", "manual"]);
export const rentalStatusEnum = pgEnum("rental_status", ["pending", "active", "expired", "cancelled", "suspended"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "past_due", "cancelled", "expired"]);
export const transactionTypeEnum = pgEnum("transaction_type", ["deposit", "withdrawal", "rental_payment", "rental_renewal", "refund", "sms_purchase", "otp_purchase"]);
export const transactionStatusEnum = pgEnum("transaction_status", ["pending", "completed", "failed", "reversed"]);
export const orderStatusEnum = pgEnum("order_status", ["pending", "processing", "completed", "failed", "refunded"]);
export const smsDirectionEnum = pgEnum("sms_direction", ["inbound", "outbound"]);
export const campaignStatusEnum = pgEnum("campaign_status", ["draft", "processing", "completed", "failed", "partial"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  role: userRoleEnum("role").default("customer").notNull(),
  isVerified: boolean("is_verified").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const wallets = pgTable("wallets", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  balance: decimal("balance", { precision: 12, scale: 2 }).default("0.00").notNull(),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const transactions = pgTable("transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  walletId: uuid("wallet_id").references(() => wallets.id).notNull(),
  type: transactionTypeEnum("type").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  status: transactionStatusEnum("status").default("pending").notNull(),
  description: text("description"),
  reference: varchar("reference", { length: 255 }),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const countries = pgTable("countries", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  code: varchar("code", { length: 5 }).notNull().unique(),
  dialCode: varchar("dial_code", { length: 10 }).notNull(),
  flagEmoji: varchar("flag_emoji", { length: 10 }),
  isActive: boolean("is_active").default(true).notNull(),
});

export const phoneNumbers = pgTable("phone_numbers", {
  id: uuid("id").defaultRandom().primaryKey(),
  number: varchar("number", { length: 20 }).notNull().unique(),
  countryId: uuid("country_id").references(() => countries.id).notNull(),
  source: numberSourceEnum("source").default("manual").notNull(),
  status: numberStatusEnum("status").default("available").notNull(),
  assignedUserId: uuid("assigned_user_id").references(() => users.id),
  monthlyPrice: decimal("monthly_price", { precision: 8, scale: 2 }).notNull(),
  costPrice: decimal("cost_price", { precision: 8, scale: 2 }),
  capabilities: text("capabilities"),
  provider: varchar("provider", { length: 50 }),
  providerNumberId: varchar("provider_number_id", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const rentals = pgTable("rentals", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  phoneNumberId: uuid("phone_number_id").references(() => phoneNumbers.id).notNull(),
  status: rentalStatusEnum("status").default("pending").notNull(),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  autoRenew: boolean("auto_renew").default(true).notNull(),
  monthlyPrice: decimal("monthly_price", { precision: 8, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  rentalId: uuid("rental_id").references(() => rentals.id).notNull(),
  status: subscriptionStatusEnum("status").default("active").notNull(),
  currentPeriodStart: timestamp("current_period_start").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  nextRenewalDate: timestamp("next_renewal_date"),
  failedAttempts: integer("failed_attempts").default(0).notNull(),
  lastPaymentDate: timestamp("last_payment_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  rentalId: uuid("rental_id").references(() => rentals.id),
  status: orderStatusEnum("status").default("pending").notNull(),
  totalAmount: decimal("total_amount", { precision: 8, scale: 2 }).notNull(),
  description: text("description"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const smsMessages = pgTable("sms_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  phoneNumberId: uuid("phone_number_id").references(() => phoneNumbers.id),
  direction: smsDirectionEnum("direction").notNull(),
  fromNumber: varchar("from_number", { length: 20 }).notNull(),
  toNumber: varchar("to_number", { length: 20 }).notNull(),
  body: text("body"),
  status: varchar("status", { length: 50 }),
  providerMessageId: varchar("provider_message_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const smsCampaigns = pgTable("sms_campaigns", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  senderId: varchar("sender_id", { length: 50 }).notNull(),
  message: text("message").notNull(),
  totalRecipients: integer("total_recipients").default(0).notNull(),
  sentCount: integer("sent_count").default(0).notNull(),
  failedCount: integer("failed_count").default(0).notNull(),
  totalCost: decimal("total_cost", { precision: 10, scale: 4 }).default("0.0000").notNull(),
  status: campaignStatusEnum("status").default("draft").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const services = pgTable("services", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  icon: varchar("icon", { length: 255 }),
  category: varchar("category", { length: 50 }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const offers = pgTable("offers", {
  id: uuid("id").defaultRandom().primaryKey(),
  serviceId: uuid("service_id").references(() => services.id).notNull(),
  countryId: uuid("country_id").references(() => countries.id).notNull(),
  price: decimal("price", { precision: 8, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  provider: varchar("provider", { length: 50 }).notNull(),
  providerReference: varchar("provider_reference", { length: 255 }),
  status: transactionStatusEnum("status").default("pending").notNull(),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  keyHash: text("key_hash").notNull(),
  keyPrefix: varchar("key_prefix", { length: 10 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});