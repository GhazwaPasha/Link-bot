import { createId } from "@paralleldrive/cuid2";
import { relations, sql } from "drizzle-orm";
import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgSequence,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import type { FormField } from "@discord-forms/shared";

// Table/column names and defaults below are translated 1:1 from the Prisma schema and its
// applied migrations (packages/db/prisma/migrations, now removed) to keep the live Supabase
// schema unchanged. Two things Prisma handled implicitly needed explicit replication:
//  - `@default(cuid())` ids are generated client-side by Prisma, never a DB default — cuid2's
//    createId() plays the same role here via $defaultFn.
//  - `@updatedAt` columns have NO database default (confirmed in the migration SQL: NOT NULL,
//    no DEFAULT) — Prisma sets them on every create *and* update from the client. $defaultFn
//    covers create, $onUpdateFn covers update.

export const formStatusEnum = pgEnum("FormStatus", ["DRAFT", "PUBLISHED"]);
export const submissionStatusEnum = pgEnum("SubmissionStatus", ["PENDING", "APPROVED", "REJECTED"]);
export const integrationTypeEnum = pgEnum("IntegrationType", ["SHEETS", "WEBHOOK"]);
export const panelButtonStyleEnum = pgEnum("PanelButtonStyle", ["PRIMARY", "SECONDARY", "SUCCESS", "DANGER"]);
export const submissionSourceEnum = pgEnum("SubmissionSource", ["DISCORD", "WEB"]);
export const deliveryStatusEnum = pgEnum("DeliveryStatus", ["PENDING", "DELIVERED", "FAILED"]);

export type FormStatus = (typeof formStatusEnum.enumValues)[number];
export type SubmissionStatus = (typeof submissionStatusEnum.enumValues)[number];
export type IntegrationType = (typeof integrationTypeEnum.enumValues)[number];
export type PanelButtonStyle = (typeof panelButtonStyleEnum.enumValues)[number];
export type SubmissionSource = (typeof submissionSourceEnum.enumValues)[number];
export type DeliveryStatus = (typeof deliveryStatusEnum.enumValues)[number];

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "bytea",
});

const createdAt = () => timestamp("created_at").notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at")
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date());

// Backs `forms.serialNumber` — a DB sequence (rather than client-side generation like the
// cuid `id`s) so the numeric part is guaranteed gap-free and race-safe under concurrent inserts.
export const formSerialSeq = pgSequence("form_serial_seq", {
  startWith: 1,
  increment: 1,
  minValue: 1,
});

export const guilds = pgTable("guilds", {
  guildId: text("guild_id").primaryKey(),
  name: text("name"),
  iconUrl: text("icon_url"),
  reviewRoleIds: text("review_role_ids").array().notNull().default([]),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
  leftAt: timestamp("left_at"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const forms = pgTable(
  "forms",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    // Human-readable reference distinct from `id` — e.g. "FRM-2026-0001". DB-generated (not
    // $defaultFn like `id`) because the sequence must be assigned atomically by Postgres to
    // stay gap-free/unique under concurrent inserts.
    serialNumber: text("serial_number")
      .notNull()
      .unique()
      .default(sql`('FRM-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('form_serial_seq')::text, 4, '0'))`),
    guildId: text("guild_id")
      .notNull()
      .references(() => guilds.guildId, { onDelete: "cascade", onUpdate: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    fields: jsonb("fields").$type<FormField[]>().notNull().default([]),
    status: formStatusEnum("status").notNull().default("DRAFT"),
    reviewChannelId: text("review_channel_id"),
    outputChannelId: text("output_channel_id"),
    // Independent of `status` — status/publish gates Discord panel distribution
    // (see validateFormFields), this gates the public web-form page. A form can
    // be enabled for one channel, the other, or both.
    webFormEnabled: boolean("web_form_enabled").notNull().default(false),
    approveButtonLabel: text("approve_button_label").notNull().default("Approve"),
    rejectButtonLabel: text("reject_button_label").notNull().default("Reject"),
    // Shown to the submitter right after they submit — the public web form's success
    // screen, and the ephemeral reply after a Discord modal submission.
    confirmationMessage: text("confirmation_message").notNull().default("Thanks — your submission has been recorded."),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("forms_guild_id_idx").on(table.guildId)],
);

export const panels = pgTable(
  "panels",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    guildId: text("guild_id")
      .notNull()
      .references(() => guilds.guildId, { onDelete: "cascade", onUpdate: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    postChannelId: text("post_channel_id").notNull(),
    messageId: text("message_id"),
    failedAt: timestamp("failed_at"),
    lastError: text("last_error"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("panels_guild_id_idx").on(table.guildId)],
);

export const panelButtons = pgTable(
  "panel_buttons",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    panelId: text("panel_id")
      .notNull()
      .references(() => panels.id, { onDelete: "cascade", onUpdate: "cascade" }),
    formId: text("form_id")
      .notNull()
      .references(() => forms.id, { onDelete: "cascade", onUpdate: "cascade" }),
    label: text("label").notNull(),
    style: panelButtonStyleEnum("style").notNull().default("PRIMARY"),
    emoji: text("emoji"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
  },
  (table) => [
    index("panel_buttons_panel_id_idx").on(table.panelId),
    index("panel_buttons_form_id_idx").on(table.formId),
  ],
);

export const submissions = pgTable(
  "submissions",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    formId: text("form_id")
      .notNull()
      .references(() => forms.id, { onDelete: "cascade", onUpdate: "cascade" }),
    guildId: text("guild_id")
      .notNull()
      .references(() => guilds.guildId, { onDelete: "cascade", onUpdate: "cascade" }),
    userId: text("user_id").notNull(),
    answers: jsonb("answers").$type<Record<string, string>>().notNull().default({}),
    status: submissionStatusEnum("status").notNull().default("PENDING"),
    // "DISCORD" rows come through the modal flow (finalizeSubmission); "WEB" rows are
    // saved first by the web app, which then tries to post them to Discord itself.
    // Review-button clicks route through Discord's gateway to the bot regardless of
    // which process posted the message.
    source: submissionSourceEnum("source").notNull().default("DISCORD"),
    // Outbox state for getting the submission's message into Discord. Only WEB rows
    // ever start as PENDING: the web app saves before posting, so a Discord outage
    // or 429 can't lose a submission — if its own attempt fails, the bot's delivery
    // poller (apps/bot/src/deliveryPoller.ts) retries with backoff. Defaults to
    // DELIVERED so Discord-native rows (posted synchronously by the bot) and every
    // pre-existing row are untouched.
    deliveryStatus: deliveryStatusEnum("delivery_status").notNull().default("DELIVERED"),
    deliveryAttempts: integer("delivery_attempts").notNull().default(0),
    deliveryLastError: text("delivery_last_error"),
    deliveryNextAttemptAt: timestamp("delivery_next_attempt_at"),
    ip: text("ip"),
    reviewChannelId: text("review_channel_id"),
    reviewMessageId: text("review_message_id"),
    outputChannelId: text("output_channel_id"),
    reviewedBy: text("reviewed_by"),
    reviewedAt: timestamp("reviewed_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("submissions_form_id_idx").on(table.formId),
    index("submissions_guild_id_idx").on(table.guildId),
    index("submissions_delivery_idx").on(table.deliveryStatus, table.deliveryNextAttemptAt),
  ],
);

// Web-form image uploads waiting to be delivered to Discord. Discord's CDN is still
// the long-term home for them (see reviewFlow's loadReviewMessageAttachments) — rows
// here only live until the submission's message is posted, then get deleted.
export const submissionFiles = pgTable(
  "submission_files",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    submissionId: text("submission_id")
      .notNull()
      .references(() => submissions.id, { onDelete: "cascade", onUpdate: "cascade" }),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    data: bytea("data").notNull(),
    createdAt: createdAt(),
  },
  (table) => [index("submission_files_submission_id_idx").on(table.submissionId)],
);

export const integrations = pgTable(
  "integrations",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    guildId: text("guild_id")
      .notNull()
      .references(() => guilds.guildId, { onDelete: "cascade", onUpdate: "cascade" }),
    formId: text("form_id")
      .notNull()
      .references(() => forms.id, { onDelete: "cascade", onUpdate: "cascade" }),
    type: integrationTypeEnum("type").notNull(),
    config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("integrations_guild_id_idx").on(table.guildId),
    index("integrations_form_id_idx").on(table.formId),
  ],
);

export const guildsRelations = relations(guilds, ({ many }) => ({
  forms: many(forms),
  panels: many(panels),
  submissions: many(submissions),
  integrations: many(integrations),
}));

export const formsRelations = relations(forms, ({ one, many }) => ({
  guild: one(guilds, { fields: [forms.guildId], references: [guilds.guildId] }),
  panelButtons: many(panelButtons),
  submissions: many(submissions),
  integrations: many(integrations),
}));

export const panelsRelations = relations(panels, ({ one, many }) => ({
  guild: one(guilds, { fields: [panels.guildId], references: [guilds.guildId] }),
  buttons: many(panelButtons),
}));

export const panelButtonsRelations = relations(panelButtons, ({ one }) => ({
  panel: one(panels, { fields: [panelButtons.panelId], references: [panels.id] }),
  form: one(forms, { fields: [panelButtons.formId], references: [forms.id] }),
}));

export const submissionsRelations = relations(submissions, ({ one, many }) => ({
  form: one(forms, { fields: [submissions.formId], references: [forms.id] }),
  guild: one(guilds, { fields: [submissions.guildId], references: [guilds.guildId] }),
  files: many(submissionFiles),
}));

export const submissionFilesRelations = relations(submissionFiles, ({ one }) => ({
  submission: one(submissions, { fields: [submissionFiles.submissionId], references: [submissions.id] }),
}));

export const integrationsRelations = relations(integrations, ({ one }) => ({
  guild: one(guilds, { fields: [integrations.guildId], references: [guilds.guildId] }),
  form: one(forms, { fields: [integrations.formId], references: [forms.id] }),
}));

export type Guild = typeof guilds.$inferSelect;
export type Form = typeof forms.$inferSelect;
export type Panel = typeof panels.$inferSelect;
export type PanelButton = typeof panelButtons.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
export type SubmissionFile = typeof submissionFiles.$inferSelect;
export type Integration = typeof integrations.$inferSelect;
