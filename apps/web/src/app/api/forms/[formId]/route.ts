import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { formFieldsSchema, validateWebFormFields } from "@discord-forms/shared";
import { db } from "@/lib/db";
import { forms } from "@discord-forms/db";
import { eq } from "drizzle-orm";
import { checkGuildAccess } from "@/lib/apiAuth";

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  fields: formFieldsSchema.optional(),
  reviewChannelId: z.string().nullable().optional(),
  outputChannelId: z.string().nullable().optional(),
  webFormEnabled: z.boolean().optional(),
  // 80 chars matches discord.js's ButtonBuilder label cap.
  approveButtonLabel: z.string().min(1).max(80).optional(),
  rejectButtonLabel: z.string().min(1).max(80).optional(),
  confirmationMessage: z.string().min(1).max(500).optional(),
});

async function getFormOr404(formId: string) {
  const form = await db.query.forms.findFirst({ where: eq(forms.id, formId) });
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

  if (parsed.data.webFormEnabled) {
    const fields = formFieldsSchema.parse(parsed.data.fields ?? form.fields);
    if (fields.length === 0) {
      return NextResponse.json({ error: "Add at least one field before enabling the public web form." }, { status: 400 });
    }
    const issues = validateWebFormFields(fields);
    if (issues.length > 0) {
      return NextResponse.json({ error: "Form isn't ready for the public web form", issues }, { status: 400 });
    }
  }

  const [updated] = await db.update(forms).set(parsed.data).where(eq(forms.id, params.formId)).returning();

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { formId: string } }) {
  const form = await getFormOr404(params.formId);
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const access = await checkGuildAccess(form.guildId);
  if (!access.ok) return NextResponse.json({ error: "Forbidden" }, { status: access.status });

  await db.delete(forms).where(eq(forms.id, params.formId));
  return NextResponse.json({ ok: true });
}
