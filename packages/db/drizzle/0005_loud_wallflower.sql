CREATE TYPE "public"."DeliveryStatus" AS ENUM('PENDING', 'DELIVERED', 'FAILED');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "submission_files" (
	"id" text PRIMARY KEY NOT NULL,
	"submission_id" text NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"data" "bytea" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "delivery_status" "DeliveryStatus" DEFAULT 'DELIVERED' NOT NULL;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "delivery_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "delivery_last_error" text;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "delivery_next_attempt_at" timestamp;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "submission_files" ADD CONSTRAINT "submission_files_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "submission_files_submission_id_idx" ON "submission_files" USING btree ("submission_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "submissions_delivery_idx" ON "submissions" USING btree ("delivery_status","delivery_next_attempt_at");