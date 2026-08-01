import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { formFieldsSchema } from "@discord-forms/shared";
import { prisma } from "@/lib/db";
import { checkGuildAccess } from "@/lib/apiAuth";

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  fields: formFieldsSchema.optional(),
  reviewChannelId: z.string().nullable().optional(),
  outputChannelId: z.string().nullable().optional(),
});

async function getFormOr404(formId: string) {
  const form = await prisma.form.findUnique({ where: { id: formId } });
  return form;
}

export async function GET(_req: NextRequest, { params }: { params: { formId: string } }) {
  const form = await getFormOr404(params.formId);
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const access = await checkGuildAccess(form.guildId);
  if (!access.ok) return NextResponse.json({ error: "Forbidden" }, { status: access.status });

  return NextResponse.json(form);
}

export async function PATCH(req: NextRequest, { params }: { params: { formId: string } }) {
  const form = await getFormOr404(params.formId);
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const access = await checkGuildAccess(form.guildId);
  if (!access.ok) return NextResponse.json({ error: "Forbidden" }, { status: access.status });

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", issues: parsed.error.issues }, { status: 400 });
  }

  const updated = await prisma.form.update({
    where: { id: params.formId },
    data: parsed.data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { formId: string } }) {
  const form = await getFormOr404(params.formId);
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const access = await checkGuildAccess(form.guildId);
  if (!access.ok) return NextResponse.json({ error: "Forbidden" }, { status: access.status });

  await prisma.form.delete({ where: { id: params.formId } });
  return NextResponse.json({ ok: true });
}
