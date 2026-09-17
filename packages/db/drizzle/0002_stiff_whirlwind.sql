ALTER TABLE "submissions" DROP COLUMN IF EXISTS "image_attachments";--> statement-breakpoint
ALTER TABLE "submissions" DROP COLUMN IF EXISTS "delivered_at";--> statement-breakpoint
ALTER TABLE "submissions" DROP COLUMN IF EXISTS "failed_at";--> statement-breakpoint
ALTER TABLE "submissions" DROP COLUMN IF EXISTS "last_error";