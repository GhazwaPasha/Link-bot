import { db, guilds } from "@discord-forms/db";
import { and, isNull, notInArray, sql } from "drizzle-orm";
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

  await db.transaction(async (tx) => {
    // drizzle-orm's notInArray degrades to an always-true predicate for an empty array (matching
    // Prisma's notIn: [] semantics) rather than emitting invalid `NOT (x IN ())` SQL.
    await tx
      .update(guilds)
      .set({ leftAt: new Date() })
      .where(and(notInArray(guilds.guildId, currentIds), isNull(guilds.leftAt)));
    for (const guild of currentGuilds) {
      await tx
        .insert(guilds)
        .values({ guildId: guild.id, name: guild.name, iconUrl: guild.iconURL() })
        .onConflictDoUpdate({
          target: guilds.guildId,
          set: { name: guild.name, iconUrl: guild.iconURL(), leftAt: null, updatedAt: sql`now()` },
        });
    }
  });

  console.log(`[reconcile] synced guild membership: ${currentIds.length} guild(s) currently joined`);
}
