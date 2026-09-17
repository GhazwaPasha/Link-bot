import { db } from "@/lib/db";
import { integrations as integrationsTable, type Form, type Submission } from "@discord-forms/db";
import { and, eq } from "drizzle-orm";
import { appendToSheet, postToWebhook, type SheetsConfig, type WebhookConfig } from "@discord-forms/shared/integrations";

/** Mirrors apps/bot/src/integrations/index.ts — the web app runs its own auto-approved web-form submissions through the same integrations, without waiting on the bot. */
export async function runIntegrations(form: Form, submission: Submission) {
  const rows = await db.query.integrations.findMany({
    where: and(eq(integrationsTable.formId, form.id), eq(integrationsTable.enabled, true)),
  });

  for (const integration of rows) {
    try {
      if (integration.type === "SHEETS") {
        await appendToSheet(integration.config as unknown as SheetsConfig, form, submission);
      } else if (integration.type === "WEBHOOK") {
        await postToWebhook(integration.config as unknown as WebhookConfig, form, submission);
      }
    } catch (err) {
      console.error(`[integrations] ${integration.type} failed for form ${form.id}:`, err);
    }
  }
}
