import { cache } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDiscordAccessToken } from "@/lib/serverToken";
import { fetchUserGuilds, hasManageGuild, type DiscordGuild } from "@/lib/discord";

/** The set of guilds the signed-in user has MANAGE_GUILD on, per-request cached. */
export const getManageableGuilds = cache(async (): Promise<DiscordGuild[]> => {
  const accessToken = await getDiscordAccessToken();
  if (!accessToken) return [];
  const guilds = await fetchUserGuilds(accessToken);
  return guilds.filter(hasManageGuild);
});

/** Redirects home if the signed-in user can't manage this guild. Use at the top of every dashboard/[guildId] page. */
export async function requireGuildAccess(guildId: string): Promise<DiscordGuild> {
  const session = await getServerSession(authOptions);
  if (!session || session.error) redirect("/");

  const guilds = await getManageableGuilds();
  const guild = guilds.find((g) => g.id === guildId);
  if (!guild) redirect("/dashboard");
  return guild;
}
