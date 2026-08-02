export interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
}

const MANAGE_GUILD = 0x20n;

// View Channel, Send Messages, Embed Links, Read Message History
const BOT_PERMISSIONS = "85016";

export async function fetchUserGuilds(accessToken: string): Promise<DiscordGuild[]> {
  const res = await fetch("https://discord.com/api/users/@me/guilds", {
    headers: { Authorization: `Bearer ${accessToken}` },
    next: { revalidate: 30 },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch Discord guilds: ${res.status}`);
  }
  return res.json();
}

export function hasManageGuild(guild: DiscordGuild): boolean {
  return guild.owner || (BigInt(guild.permissions) & MANAGE_GUILD) === MANAGE_GUILD;
}

export function guildIconUrl(guild: { id: string; icon: string | null }): string | null {
  return guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : null;
}

export function botInviteUrl(guildId?: string): string {
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID ?? "",
    scope: "bot applications.commands",
    permissions: BOT_PERMISSIONS,
  });
  if (guildId) {
    params.set("guild_id", guildId);
    params.set("disable_guild_select", "true");
  }
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}
