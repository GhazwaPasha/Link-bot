import { prisma } from "@/lib/db";
import { CreatePanel } from "@/components/CreatePanel";

export default async function PanelsPage({ params }: { params: { guildId: string } }) {
  const [panels, publishedForms] = await Promise.all([
    prisma.panel.findMany({ where: { guildId: params.guildId }, include: { form: true }, orderBy: { createdAt: "desc" } }),
    prisma.form.findMany({ where: { guildId: params.guildId, status: "PUBLISHED" }, select: { id: true, name: true, description: true } }),
  ]);

  return (
    <main className="p-8">
      <h1 className="mb-6 text-2xl font-bold">Panels</h1>

      <CreatePanel guildId={params.guildId} forms={publishedForms} />

      <div className="mt-8 flex flex-col gap-3">
        {panels.map((panel) => (
          <div key={panel.id} className="flex items-center justify-between rounded border border-border bg-card p-4">
            <div>
              <p className="font-medium">{panel.form.name}</p>
              <p className="text-xs text-muted">
                #{panel.postChannelId} · {panel.buttonLabel}
              </p>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${panel.messageId ? "bg-accent-muted text-accent" : "bg-white/10 text-muted"}`}>
              {panel.messageId ? "Posted" : "Pending"}
            </span>
          </div>
        ))}
      </div>
    </main>
  );
}
