CREATE TABLE "homes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text,
	"address" text,
	"year_built" integer,
	"sqft" integer,
	"lot_size" numeric(10, 2),
	"bed_count" integer,
	"bath_count" integer,
	"purchase_price" numeric(12, 2),
	"purchase_date" timestamp with time zone,
	"sold_at" timestamp with time zone,
	"sale_price" numeric(12, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "homes_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "homes" ADD CONSTRAINT "homes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "homes_user_idx" ON "homes" USING btree ("user_id");