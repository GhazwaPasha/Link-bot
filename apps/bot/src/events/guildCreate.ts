import { Events, type Guild } from "discord.js";
import { prisma } from "@discord-forms/db";
import type { BotClient } from "../client";

export function registerGuildCreate(client: BotClient) {
  client.on(Events.GuildCreate, async (guild: Guild) => {
    await prisma.guild.upsert({
      where: { guildId: guild.id },
      update: { name: guild.name, iconUrl: guild.iconURL(), leftAt: null },
      create: { guildId: guild.id, name: guild.name, iconUrl: guild.iconURL() },
    });
    console.log(`Joined guild ${guild.name} (${guild.id})`);
  });
}
