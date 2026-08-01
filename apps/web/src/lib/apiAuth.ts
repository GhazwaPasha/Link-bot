import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getManageableGuilds } from "@/lib/guildAccess";

/** Same access check as requireGuildAccess, but returns a status instead of redirecting — for use in Route Handlers. */
export async function checkGuildAccess(guildId: string): Promise<{ ok: true } | { ok: false; status: 401 | 403 }> {
  const session = await getServerSession(authOptions);
  if (!session) return { ok: false, status: 401 };

  const guilds = await getManageableGuilds();
  if (!guilds.some((g) => g.id === guildId)) return { ok: false, status: 403 };
  return { ok: true };
}
