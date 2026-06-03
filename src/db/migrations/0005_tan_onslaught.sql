ALTER TABLE "item_templates" ADD COLUMN "home_id" uuid;--> statement-breakpoint
ALTER TABLE "item_templates" ADD CONSTRAINT "item_templates_home_id_homes_id_fk" FOREIGN KEY ("home_id") REFERENCES "public"."homes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "item_templates_home_idx" ON "item_templates" USING btree ("home_id");