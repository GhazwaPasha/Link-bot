import { db } from "@/lib/db";
import { guilds } from "@discord-forms/db";
import { eq } from "drizzle-orm";
import { GuildSettingsEditor } from "@/components/GuildSettingsEditor";

export default async function GuildSettingsPage({ params }: { params: { guildId: string } }) {
  const guild = await db.query.guilds.findFirst({ where: eq(guilds.guildId, params.guildId) });

  return <GuildSettingsEditor guildId={params.guildId} initialReviewRoleIds={guild?.reviewRoleIds ?? []} />;
}
