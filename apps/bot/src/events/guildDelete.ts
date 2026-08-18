import { Events, type Guild } from "discord.js";
import { db, guilds } from "@discord-forms/db";
import { eq } from "drizzle-orm";
import type { BotClient } from "../client";

export function registerGuildDelete(client: BotClient) {
  client.on(Events.GuildDelete, async (guild: Guild) => {
    // No error if the guild row doesn't exist (never fully synced) — a plain UPDATE just
    // affects 0 rows, unlike Prisma's update() which throws on no match.
    await db.update(guilds).set({ leftAt: new Date() }).where(eq(guilds.guildId, guild.id));
    console.log(`Left guild ${guild.id}`);
  });
}
