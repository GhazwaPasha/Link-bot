export interface DiscordChannel {
  id: string;
  name: string;
  type: number;
}

const GUILD_TEXT = 0;

/** Lists a guild's text channels using the bot's own token — only the bot (a guild member) can see this. */
export async function getGuildTextChannels(guildId: string): Promise<DiscordChannel[]> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) throw new Error("DISCORD_BOT_TOKEN is not set");

  const res = await fetch(`https://discord.com/api/guilds/${guildId}/channels`, {
    headers: { Authorization: `Bot ${botToken}` },
    next: { revalidate: 30 },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch channels: ${res.status}`);
  }
  const channels: DiscordChannel[] = await res.json();
  return channels.filter((c) => c.type === GUILD_TEXT);
}

export interface DiscordRole {
  id: string;
  name: string;
  managed: boolean;
}

export async function getGuildRoles(guildId: string): Promise<DiscordRole[]> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) throw new Error("DISCORD_BOT_TOKEN is not set");

  const res = await fetch(`https://discord.com/api/guilds/${guildId}/roles`, {
    headers: { Authorization: `Bot ${botToken}` },
    next: { revalidate: 30 },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch roles: ${res.status}`);
  }
  const roles: DiscordRole[] = await res.json();
  return roles.filter((r) => !r.managed && r.name !== "@everyone");
}
