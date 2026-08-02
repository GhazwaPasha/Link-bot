import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
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
  const publishedForms = await prisma.form.findMany({
    where: { id: { in: formIds }, guildId: params.guildId, status: "PUBLISHED" },
    select: { id: true },
  });
  if (publishedForms.length !== formIds.length) {
    return NextResponse.json({ error: "One or more buttons target a form that isn't published." }, { status: 400 });
  }

  // messageId is left null — the bot's poller (or a live gateway connection) picks this up and posts it.
  const panel = await prisma.panel.create({
    data: {
      guildId: params.guildId,
      name: parsed.data.name,
      description: parsed.data.description,
      postChannelId: parsed.data.postChannelId,
      buttons: {
        create: parsed.data.buttons.map((b, i) => ({
          formId: b.formId,
          label: b.label,
          style: b.style,
          emoji: b.emoji,
          sortOrder: i,
        })),
      },
    },
    include: { buttons: true },
  });

  return NextResponse.json(panel);
}
