import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { forms, panelButtons, panels } from "@discord-forms/db";
import { and, eq, inArray } from "drizzle-orm";
import { checkGuildAccess } from "@/lib/apiAuth";

const buttonSchema = z.object({
  formId: z.string().min(1),
  label: z.string().min(1).max(80),
  style: z.enum(["PRIMARY", "SECONDARY", "SUCCESS", "DANGER"]).default("PRIMARY"),
  emoji: z.string().max(16).optional(),
});

const createPanelSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  postChannelId: z.string().min(1),
  buttons: z.array(buttonSchema).min(1).max(5),
});

export async function POST(req: NextRequest, { params }: { params: { guildId: string } }) {
  const access = await checkGuildAccess(params.guildId);
  if (!access.ok) return NextResponse.json({ error: "Forbidden" }, { status: access.status });

  const parsed = createPanelSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", issues: parsed.error.issues }, { status: 400 });
  }

  const formIds = [...new Set(parsed.data.buttons.map((b) => b.formId))];
  const publishedForms = await db.query.forms.findMany({
    where: and(inArray(forms.id, formIds), eq(forms.guildId, params.guildId), eq(forms.status, "PUBLISHED")),
    columns: { id: true },
  });
  if (publishedForms.length !== formIds.length) {
    return NextResponse.json({ error: "One or more buttons target a form that isn't published." }, { status: 400 });
  }

  // messageId is left null — the bot's poller (or a live gateway connection) picks this up and posts it.
  const panel = await db.transaction(async (tx) => {
    const [panelRow] = await tx
      .insert(panels)
      .values({
        guildId: params.guildId,
        name: parsed.data.name,
        description: parsed.data.description,
        postChannelId: parsed.data.postChannelId,
      })
      .returning();
    const buttonRows = await tx
      .insert(panelButtons)
      .values(
        parsed.data.buttons.map((b, i) => ({
          panelId: panelRow.id,
          formId: b.formId,
          label: b.label,
          style: b.style,
          emoji: b.emoji,
          sortOrder: i,
        })),
      )
      .returning();
    return { ...panelRow, buttons: buttonRows };
  });

  return NextResponse.json(panel);
}
