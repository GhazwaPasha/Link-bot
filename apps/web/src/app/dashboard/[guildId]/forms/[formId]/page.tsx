import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formFieldsSchema } from "@discord-forms/shared";
import { QuestionsEditor } from "@/components/QuestionsEditor";

export default async function QuestionsPage({ params }: { params: { guildId: string; formId: string } }) {
  const form = await prisma.form.findFirst({ where: { id: params.formId, guildId: params.guildId } });
  if (!form) notFound();

  const fields = formFieldsSchema.parse(form.fields);

  return <QuestionsEditor formId={form.id} formName={form.name} initialFields={fields} status={form.status} />;
}
