import { createHmac } from "node:crypto";
import type { Form, Submission } from "@discord-forms/db";
import { formatAnswerValue, formFieldsSchema } from "@discord-forms/shared";

export interface WebhookConfig {
  url: string;
  /** Optional shared secret; if set, requests are signed via X-Signature (HMAC-SHA256 of the body). */
  secret?: string;
}

export async function postToWebhook(config: WebhookConfig, form: Form, submission: Submission) {
  const fields = formFieldsSchema.parse(form.fields);
  const answers = submission.answers;

  const body = JSON.stringify({
    formId: form.id,
    formName: form.name,
    submissionId: submission.id,
    guildId: submission.guildId,
    userId: submission.userId,
    status: submission.status,
    submittedAt: submission.createdAt.toISOString(),
    answers: fields.map((f) => ({ label: f.label, value: formatAnswerValue(f, answers[f.id]) })),
  });

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (config.secret) {
    headers["X-Signature"] = createHmac("sha256", config.secret).update(body).digest("hex");
  }

  const res = await fetch(config.url, { method: "POST", headers, body });
  if (!res.ok) {
    throw new Error(`Webhook POST failed: ${res.status} ${res.statusText}`);
  }
}
