import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { forms } from "@discord-forms/db";
import { and, eq } from "drizzle-orm";
import { formFieldsSchema, validateWebFormFields } from "@discord-forms/shared";
import { WebFormEditor } from "@/components/WebFormEditor";

export default async function WebFormPage({ params }: { params: { guildId: string; formId: string } }) {
  const form = await db.query.forms.findFirst({
    where: and(eq(forms.id, params.formId), eq(forms.guildId, params.guildId)),
  });
  if (!form) notFound();

  const fields = formFieldsSchema.parse(form.fields);
  const blockingIssues = validateWebFormFields(fields);
  const baseUrl = (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");

  return (
    <WebFormEditor
      formId={form.id}
      publicUrl={`${baseUrl}/f/${form.id}`}
      embedScriptUrl={`${baseUrl}/embed.js`}
      initialEnabled={form.webFormEnabled}
      blockingIssues={blockingIssues.map((i) => i.message)}
    />
  );
}
