import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { SettingsEditor } from "@/components/SettingsEditor";

export default async function FormSettingsPage({ params }: { params: { guildId: string; formId: string } }) {
  const form = await prisma.form.findFirst({ where: { id: params.formId, guildId: params.guildId } });
  if (!form) notFound();

  const integrations = await prisma.integration.findMany({ where: { formId: form.id } });
  const webhookRow = integrations.find((i) => i.type === "WEBHOOK");
  const sheetsRow = integrations.find((i) => i.type === "SHEETS");

  const webhookConfig = (webhookRow?.config ?? {}) as { url?: string; secret?: string };
  const sheetsConfig = (sheetsRow?.config ?? {}) as { spreadsheetId?: string; sheetName?: string; serviceAccountJson?: string };

  return (
    <SettingsEditor
      guildId={params.guildId}
      formId={form.id}
      initialName={form.name}
      initialDescription={form.description ?? ""}
      initialReviewChannelId={form.reviewChannelId}
      initialOutputChannelId={form.outputChannelId}
      initialIntegrations={{
        webhook: webhookRow
          ? { url: webhookConfig.url ?? "", secret: webhookConfig.secret ?? "", enabled: webhookRow.enabled }
          : undefined,
        sheets: sheetsRow
          ? {
              spreadsheetId: sheetsConfig.spreadsheetId ?? "",
              sheetName: sheetsConfig.sheetName ?? "Sheet1",
              serviceAccountJson: sheetsConfig.serviceAccountJson ?? "",
              enabled: sheetsRow.enabled,
            }
          : undefined,
      }}
    />
  );
}
