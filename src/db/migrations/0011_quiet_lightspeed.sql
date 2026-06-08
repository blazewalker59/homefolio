CREATE TABLE "shapes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"home_id" uuid NOT NULL,
	"floor_id" uuid NOT NULL,
	"room_id" uuid,
	"points" jsonb NOT NULL,
	"label" text,
	"color" text,
	"z" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shapes" ADD CONSTRAINT "shapes_home_id_homes_id_fk" FOREIGN KEY ("home_id") REFERENCES "public"."homes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shapes" ADD CONSTRAINT "shapes_floor_id_floors_id_fk" FOREIGN KEY ("floor_id") REFERENCES "public"."floors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shapes" ADD CONSTRAINT "shapes_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shapes_home_idx" ON "shapes" USING btree ("home_id");--> statement-breakpoint
CREATE INDEX "shapes_floor_idx" ON "shapes" USING btree ("floor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shapes_room_uq" ON "shapes" USING btree ("room_id") WHERE "shapes"."room_id" is not null;