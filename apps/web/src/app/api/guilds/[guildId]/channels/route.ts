import { NextResponse, type NextRequest } from "next/server";
import { checkGuildAccess } from "@/lib/apiAuth";
import { getGuildTextChannels } from "@/lib/discordBot";

export async function GET(_req: NextRequest, { params }: { params: { guildId: string } }) {
  const access = await checkGuildAccess(params.guildId);
  if (!access.ok) return NextResponse.json({ error: "Forbidden" }, { status: access.status });

  try {
    const channels = await getGuildTextChannels(params.guildId);
    return NextResponse.json(channels);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
