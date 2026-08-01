import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { FormTabs } from "@/components/FormTabs";

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
        <div>
          <h1 className="text-2xl font-bold">{form.name}</h1>
          <span
            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
              form.status === "PUBLISHED" ? "bg-accent-muted text-accent" : "bg-white/10 text-muted"
            }`}
          >
            {form.status === "PUBLISHED" ? "Published" : "Draft"}
          </span>
        </div>
      </div>
      <FormTabs guildId={params.guildId} formId={params.formId} />
      {children}
    </div>
  );
}
