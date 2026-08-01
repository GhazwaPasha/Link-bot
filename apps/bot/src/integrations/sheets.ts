import { google } from "googleapis";
import type { Form, Submission } from "@discord-forms/db";
import { formatAnswerValue, formFieldsSchema } from "@discord-forms/shared";

export interface SheetsConfig {
  spreadsheetId: string;
  sheetName?: string;
  /** Stringified Google service-account JSON key (downloaded from the GCP console). */
  serviceAccountJson: string;
}

export async function appendToSheet(config: SheetsConfig, form: Form, submission: Submission) {
  const credentials = JSON.parse(config.serviceAccountJson);
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  const fields = formFieldsSchema.parse(form.fields);
  const answers = submission.answers as Record<string, string>;
  const row = [
    submission.createdAt.toISOString(),
    submission.userId,
    ...fields.map((f) => formatAnswerValue(f, answers[f.id])),
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: config.spreadsheetId,
    range: `${config.sheetName ?? "Sheet1"}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });
}
