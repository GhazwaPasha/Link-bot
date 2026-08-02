import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { FormTabs } from "@/components/FormTabs";
import { Badge } from "@/components/ui/badge";

export default async function FormLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { guildId: string; formId: string };
}) {
  const form = await prisma.form.findFirst({ where: { id: params.formId, guildId: params.guildId } });
  if (!form) notFound();

  return (
    <div>
      <div className="flex items-center justify-between px-8 pt-8">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{form.name}</h1>
          <Badge variant={form.status === "PUBLISHED" ? "default" : "secondary"}>
            {form.status === "PUBLISHED" ? "Published" : "Draft"}
          </Badge>
        </div>
      </div>
      <FormTabs guildId={params.guildId} formId={params.formId} />
      {children}
    </div>
  );
}
