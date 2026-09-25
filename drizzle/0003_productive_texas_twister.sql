CREATE TABLE "sms_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"message_id" varchar(128) NOT NULL,
	"from_number" varchar(32) NOT NULL,
	"to_number" varchar(32) NOT NULL,
	"text" text NOT NULL,
	"otp_code" varchar(12),
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sms_messages" ADD CONSTRAINT "sms_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sms_messages_message_id_unique" ON "sms_messages" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "sms_messages_user_idx" ON "sms_messages" USING btree ("user_id","received_at");--> statement-breakpoint
CREATE INDEX "sms_messages_received_idx" ON "sms_messages" USING btree ("received_at");