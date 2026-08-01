import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { checkGuildAccess } from "@/lib/apiAuth";

const createPanelSchema = z.object({
  postChannelId: z.string().min(1),
  buttonLabel: z.string().min(1).max(80).default("Submit"),
});

export async function POST(req: NextRequest, { params }: { params: { formId: string } }) {
  const form = await prisma.form.findUnique({ where: { id: params.formId } });
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const access = await checkGuildAccess(form.guildId);
  if (!access.ok) return NextResponse.json({ error: "Forbidden" }, { status: access.status });

  if (form.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Publish the form before creating a panel." }, { status: 400 });
  }

  const parsed = createPanelSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", issues: parsed.error.issues }, { status: 400 });
  }

  // messageId is left null — the bot's poller (or a live gateway connection) picks this up and posts it.
  const panel = await prisma.panel.create({
    data: {
      guildId: form.guildId,
      formId: form.id,
      postChannelId: parsed.data.postChannelId,
      buttonLabel: parsed.data.buttonLabel,
    },
  });

  return NextResponse.json(panel);
}
