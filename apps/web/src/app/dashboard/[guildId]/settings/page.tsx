import { prisma } from "@/lib/db";
import { GuildSettingsEditor } from "@/components/GuildSettingsEditor";

export default async function GuildSettingsPage({ params }: { params: { guildId: string } }) {
  const guild = await prisma.guild.findUnique({ where: { guildId: params.guildId } });

  return <GuildSettingsEditor guildId={params.guildId} initialReviewRoleIds={guild?.reviewRoleIds ?? []} />;
}
