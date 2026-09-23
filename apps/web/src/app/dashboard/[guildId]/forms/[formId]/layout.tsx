import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { forms, submissions } from "@discord-forms/db";
import { and, desc, eq } from "drizzle-orm";
import { FormTabs } from "@/components/FormTabs";
import { DeliveryFailures } from "@/components/DeliveryFailures";
import { Badge } from "@/components/ui/badge";

export default async function FormLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { guildId: string; formId: string };
}) {
  const form = await db.query.forms.findFirst({
    where: and(eq(forms.id, params.formId), eq(forms.guildId, params.guildId)),
  });
  if (!form) notFound();

  const failed = await db
    .select({ id: submissions.id, createdAt: submissions.createdAt, lastError: submissions.deliveryLastError })
    .from(submissions)
    .where(and(eq(submissions.formId, form.id), eq(submissions.deliveryStatus, "FAILED")))
    .orderBy(desc(submissions.createdAt))
    .limit(20);

  return (
    <div>
      <div className="flex items-center justify-between px-8 pt-8">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{form.name}</h1>
          <Badge variant={form.status === "PUBLISHED" ? "default" : "secondary"}>
            {form.status === "PUBLISHED" ? "Published" : "Draft"}
          </Badge>
          <span className="text-xs text-muted">{form.serialNumber}</span>
        </div>
      </div>
      <DeliveryFailures
        guildId={params.guildId}
        failures={failed.map((f) => ({ ...f, createdAt: f.createdAt.toISOString() }))}
      />
      <FormTabs guildId={params.guildId} formId={params.formId} />
      {children}
    </div>
  );
}
