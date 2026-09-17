CREATE TYPE "public"."SubmissionSource" AS ENUM('DISCORD', 'WEB');--> statement-breakpoint
ALTER TABLE "forms" ADD COLUMN "web_form_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "forms" ADD COLUMN "approve_button_label" text DEFAULT 'Approve' NOT NULL;--> statement-breakpoint
ALTER TABLE "forms" ADD COLUMN "reject_button_label" text DEFAULT 'Reject' NOT NULL;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "image_attachments" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "source" "SubmissionSource" DEFAULT 'DISCORD' NOT NULL;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "delivered_at" timestamp;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "failed_at" timestamp;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "last_error" text;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "ip" text;