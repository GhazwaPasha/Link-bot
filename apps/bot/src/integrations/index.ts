import { prisma, type Form, type Submission } from "@discord-forms/db";
import { appendToSheet, type SheetsConfig } from "./sheets";
import { postToWebhook, type WebhookConfig } from "./webhook";

/** Runs every enabled integration for a form against a newly-approved submission. */
export async function runIntegrations(form: Form, submission: Submission) {
  const integrations = await prisma.integration.findMany({
    where: { formId: form.id, enabled: true },
  });

  for (const integration of integrations) {
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
