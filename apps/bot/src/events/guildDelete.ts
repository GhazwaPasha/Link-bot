import { Events, type Guild } from "discord.js";
import { prisma } from "@discord-forms/db";
import type { BotClient } from "../client";

export function registerGuildDelete(client: BotClient) {
  client.on(Events.GuildDelete, async (guild: Guild) => {
    await prisma.guild
      .update({ where: { guildId: guild.id }, data: { leftAt: new Date() } })
      .catch(() => undefined); // guild row may not exist if it was never fully synced
    console.log(`Left guild ${guild.id}`);
  });
}
