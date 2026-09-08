ALTER TABLE "rentals" ADD COLUMN "provider" varchar(32);--> statement-breakpoint
ALTER TABLE "rentals" ADD COLUMN "provider_order_id" varchar(80);--> statement-breakpoint
ALTER TABLE "rentals" ADD COLUMN "provider_cost_minor" integer;--> statement-breakpoint
ALTER TABLE "rentals" ADD COLUMN "provider_cost_currency" varchar(8);--> statement-breakpoint
ALTER TABLE "rentals" ADD COLUMN "provider_status" varchar(32);