import { prisma } from "@/lib/db";
import { CreatePanel } from "@/components/CreatePanel";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function PanelsPage({ params }: { params: { guildId: string } }) {
  const [panels, publishedForms] = await Promise.all([
    prisma.panel.findMany({ where: { guildId: params.guildId }, include: { form: true }, orderBy: { createdAt: "desc" } }),
    prisma.form.findMany({ where: { guildId: params.guildId, status: "PUBLISHED" }, select: { id: true, name: true, description: true } }),
  ]);

  return (
    <main className="p-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Panels</h1>

      <CreatePanel guildId={params.guildId} forms={publishedForms} />

      <div className="mt-8 flex flex-col gap-3">
        {panels.map((panel) => (
          <Card key={panel.id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">{panel.form.name}</p>
              <p className="text-xs text-muted">
                #{panel.postChannelId} · {panel.buttonLabel}
              </p>
            </div>
            <Badge variant={panel.messageId ? "default" : "secondary"}>{panel.messageId ? "Posted" : "Pending"}</Badge>
          </Card>
        ))}
      </div>
    </main>
  );
}
