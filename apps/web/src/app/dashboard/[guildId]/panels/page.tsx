import { db } from "@/lib/db";
import { forms, panelButtons, panels as panelsTable } from "@discord-forms/db";
import { and, asc, desc, eq } from "drizzle-orm";
import { CreatePanel } from "@/components/CreatePanel";
import { PanelStatus } from "@/components/PanelStatus";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function PanelsPage({ params }: { params: { guildId: string } }) {
  const [panels, publishedForms] = await Promise.all([
    db.query.panels.findMany({
      where: eq(panelsTable.guildId, params.guildId),
      with: { buttons: { with: { form: true }, orderBy: asc(panelButtons.sortOrder) } },
      orderBy: desc(panelsTable.createdAt),
    }),
    db.query.forms.findMany({
      where: and(eq(forms.guildId, params.guildId), eq(forms.status, "PUBLISHED")),
      columns: { id: true, name: true, description: true },
    }),
  ]);

  return (
    <main className="p-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Panels</h1>

      <CreatePanel guildId={params.guildId} forms={publishedForms} />

      <div className="mt-8 flex flex-col gap-3">
        {panels.map((panel) => (
          <Card key={panel.id} className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-medium">{panel.name}</p>
              <PanelStatus
                guildId={params.guildId}
                panelId={panel.id}
                messageId={panel.messageId}
                failedAt={panel.failedAt}
                lastError={panel.lastError}
              />
            </div>
            <p className="mb-2 text-xs text-muted">#{panel.postChannelId}</p>
            <div className="flex flex-wrap gap-1.5">
              {panel.buttons.map((b) => (
                <Badge key={b.id} variant="outline">
                  {b.label} → {b.form.name}
                </Badge>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </main>
  );
}
