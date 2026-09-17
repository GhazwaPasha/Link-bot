import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { forms } from "@discord-forms/db";
import { eq } from "drizzle-orm";
import { formFieldsSchema } from "@discord-forms/shared";
import { PublicFormRenderer } from "@/components/PublicFormRenderer";

export default async function PublicFormPage({ params }: { params: { formId: string } }) {
  const form = await db.query.forms.findFirst({ where: eq(forms.id, params.formId) });
  if (!form || !form.webFormEnabled) notFound();

  const fields = formFieldsSchema.parse(form.fields);

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <PublicFormRenderer
        formId={form.id}
        formName={form.name}
        formDescription={form.description}
        fields={fields}
        confirmationMessage={form.confirmationMessage}
      />
    </main>
  );
}
