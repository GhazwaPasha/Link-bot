-- These 4 enum types (and every table/index/fk below) already exist in the live Supabase DB,
-- created by Prisma's migrations before this project moved off Prisma. This migration is the
-- Drizzle baseline: it's written to be a safe no-op against that existing schema (CREATE TYPE
-- has no IF NOT EXISTS in Postgres, so it's wrapped the same way the FK ADD CONSTRAINTs below
-- already are) so drizzle-kit can record it as applied without touching live data or objects.
DO $$ BEGIN
 CREATE TYPE "public"."FormStatus" AS ENUM('DRAFT', 'PUBLISHED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."IntegrationType" AS ENUM('SHEETS', 'WEBHOOK');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."PanelButtonStyle" AS ENUM('PRIMARY', 'SECONDARY', 'SUCCESS', 'DANGER');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."SubmissionStatus" AS ENUM('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "forms" (
	"id" text PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "FormStatus" DEFAULT 'DRAFT' NOT NULL,
	"review_channel_id" text,
	"output_channel_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "guilds" (
	"guild_id" text PRIMARY KEY NOT NULL,
	"name" text,
	"icon_url" text,
	"review_role_ids" text[] DEFAULT '{}' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"left_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "integrations" (
	"id" text PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"form_id" text NOT NULL,
	"type" "IntegrationType" NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "panel_buttons" (
	"id" text PRIMARY KEY NOT NULL,
	"panel_id" text NOT NULL,
	"form_id" text NOT NULL,
	"label" text NOT NULL,
	"style" "PanelButtonStyle" DEFAULT 'PRIMARY' NOT NULL,
	"emoji" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "panels" (
	"id" text PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"post_channel_id" text NOT NULL,
	"message_id" text,
	"failed_at" timestamp,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"form_id" text NOT NULL,
	"guild_id" text NOT NULL,
	"user_id" text NOT NULL,
	"answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "SubmissionStatus" DEFAULT 'PENDING' NOT NULL,
	"review_channel_id" text,
	"review_message_id" text,
	"output_channel_id" text,
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "forms" ADD CONSTRAINT "forms_guild_id_guilds_guild_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("guild_id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "integrations" ADD CONSTRAINT "integrations_guild_id_guilds_guild_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("guild_id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "integrations" ADD CONSTRAINT "integrations_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "panel_buttons" ADD CONSTRAINT "panel_buttons_panel_id_panels_id_fk" FOREIGN KEY ("panel_id") REFERENCES "public"."panels"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "panel_buttons" ADD CONSTRAINT "panel_buttons_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "panels" ADD CONSTRAINT "panels_guild_id_guilds_guild_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("guild_id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "submissions" ADD CONSTRAINT "submissions_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "submissions" ADD CONSTRAINT "submissions_guild_id_guilds_guild_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("guild_id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "forms_guild_id_idx" ON "forms" USING btree ("guild_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "integrations_guild_id_idx" ON "integrations" USING btree ("guild_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "integrations_form_id_idx" ON "integrations" USING btree ("form_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "panel_buttons_panel_id_idx" ON "panel_buttons" USING btree ("panel_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "panel_buttons_form_id_idx" ON "panel_buttons" USING btree ("form_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "panels_guild_id_idx" ON "panels" USING btree ("guild_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "submissions_form_id_idx" ON "submissions" USING btree ("form_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "submissions_guild_id_idx" ON "submissions" USING btree ("guild_id");