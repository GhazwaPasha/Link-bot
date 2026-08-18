import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { panels } from "@discord-forms/db";
import { eq } from "drizzle-orm";
import { checkGuildAccess } from "@/lib/apiAuth";

/**
 * Clears a failed panel's failure state so the bot's poller picks it up and
 * attempts to post it again on its next tick. The poller gives a panel exactly
 * one attempt per failure (see apps/bot/src/poller.ts) — this is how a person
 * asks for another one after fixing whatever caused it (recreated the channel,
 * reinstalled the bot, etc.).
 */
export async function POST(req: NextRequest, { params }: { params: { guildId: string; panelId: string } }) {
  const access = await checkGuildAccess(params.guildId);
  if (!access.ok) return NextResponse.json({ error: "Forbidden" }, { status: access.status });

  const panel = await db.query.panels.findFirst({ where: eq(panels.id, params.panelId) });
  if (!panel || panel.guildId !== params.guildId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!panel.failedAt) {
    return NextResponse.json({ error: "Panel hasn't failed, nothing to retry" }, { status: 400 });
  }

  const [updated] = await db
    .update(panels)
    .set({ failedAt: null, lastError: null })
    .where(eq(panels.id, panel.id))
    .returning();

  return NextResponse.json(updated);
}
