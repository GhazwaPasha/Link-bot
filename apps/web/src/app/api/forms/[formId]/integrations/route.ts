import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { checkGuildAccess } from "@/lib/apiAuth";

const upsertSchema = z.object({
  type: z.enum(["SHEETS", "WEBHOOK"]),
  enabled: z.boolean(),
  config: z.record(z.string()),
});

export async function GET(_req: NextRequest, { params }: { params: { formId: string } }) {
  const form = await prisma.form.findUnique({ where: { id: params.formId } });
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const access = await checkGuildAccess(form.guildId);
  if (!access.ok) return NextResponse.json({ error: "Forbidden" }, { status: access.status });

  const integrations = await prisma.integration.findMany({ where: { formId: params.formId } });
  return NextResponse.json(integrations);
}

export async function POST(req: NextRequest, { params }: { params: { formId: string } }) {
  const form = await prisma.form.findUnique({ where: { id: params.formId } });
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const access = await checkGuildAccess(form.guildId);
  if (!access.ok) return NextResponse.json({ error: "Forbidden" }, { status: access.status });

  const parsed = upsertSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", issues: parsed.error.issues }, { status: 400 });
  }

  const existing = await prisma.integration.findFirst({ where: { formId: params.formId, type: parsed.data.type } });

  const integration = existing
    ? await prisma.integration.update({
        where: { id: existing.id },
        data: { config: parsed.data.config, enabled: parsed.data.enabled },
      })
    : await prisma.integration.create({
        data: {
          formId: form.id,
          guildId: form.guildId,
          type: parsed.data.type,
          config: parsed.data.config,
          enabled: parsed.data.enabled,
        },
      });

  return NextResponse.json(integration);
}
