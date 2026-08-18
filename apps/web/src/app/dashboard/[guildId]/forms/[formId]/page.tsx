import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { forms } from "@discord-forms/db";
import { and, eq } from "drizzle-orm";
import { formFieldsSchema } from "@discord-forms/shared";
import { QuestionsEditor } from "@/components/QuestionsEditor";

export default async function QuestionsPage({ params }: { params: { guildId: string; formId: string } }) {
  const form = await db.query.forms.findFirst({
    where: and(eq(forms.id, params.formId), eq(forms.guildId, params.guildId)),
  });
  if (!form) notFound();

  const fields = formFieldsSchema.parse(form.fields);

  return <QuestionsEditor formId={form.id} formName={form.name} initialFields={fields} status={form.status} />;
}
