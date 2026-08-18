import { Events, type Guild } from "discord.js";
import { db, guilds } from "@discord-forms/db";
import { sql } from "drizzle-orm";
import type { BotClient } from "../client";

export function registerGuildCreate(client: BotClient) {
  client.on(Events.GuildCreate, async (guild: Guild) => {
    await db
      .insert(guilds)
      .values({ guildId: guild.id, name: guild.name, iconUrl: guild.iconURL() })
      .onConflictDoUpdate({
        target: guilds.guildId,
        set: { name: guild.name, iconUrl: guild.iconURL(), leftAt: null, updatedAt: sql`now()` },
      });
    console.log(`Joined guild ${guild.name} (${guild.id})`);
  });
}
