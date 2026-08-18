import { prisma } from "@discord-forms/db";
import type { BotClient } from "./client";

/**
 * GuildCreate/GuildDelete are live gateway events — they're only delivered to a
 * session that's actually connected, never queued up for a client that was down.
 * If the bot gets kicked (or invited) while its process is offline, the DB never
 * hears about it and drifts from what Discord actually has. Run this once per
 * startup, after the initial guild list has arrived, to bring the DB back in
 * line with reality instead of trusting only the delta of events we happened to
 * be online for.
 */
export async function reconcileGuilds(client: BotClient) {
  const currentGuilds = [...client.guilds.cache.values()];
  const currentIds = currentGuilds.map((g) => g.id);

  await prisma.$transaction([
    prisma.guild.updateMany({
      where: { guildId: { notIn: currentIds }, leftAt: null },
      data: { leftAt: new Date() },
    }),
    ...currentGuilds.map((guild) =>
      prisma.guild.upsert({
        where: { guildId: guild.id },
        update: { name: guild.name, iconUrl: guild.iconURL(), leftAt: null },
        create: { guildId: guild.id, name: guild.name, iconUrl: guild.iconURL() },
      }),
    ),
  ]);

  console.log(`[reconcile] synced guild membership: ${currentIds.length} guild(s) currently joined`);
}
