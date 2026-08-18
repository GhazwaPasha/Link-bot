import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { forms, integrations } from "@discord-forms/db";
import { and, eq } from "drizzle-orm";
import { checkGuildAccess } from "@/lib/apiAuth";

const upsertSchema = z.object({
  type: z.enum(["SHEETS", "WEBHOOK"]),
  enabled: z.boolean(),
  config: z.record(z.string()),
});

export async function GET(_req: NextRequest, { params }: { params: { formId: string } }) {
  const form = await db.query.forms.findFirst({ where: eq(forms.id, params.formId) });
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const access = await checkGuildAccess(form.guildId);
  if (!access.ok) return NextResponse.json({ error: "Forbidden" }, { status: access.status });

  const formIntegrations = await db.query.integrations.findMany({ where: eq(integrations.formId, params.formId) });
  return NextResponse.json(formIntegrations);
}

export async function POST(req: NextRequest, { params }: { params: { formId: string } }) {
  const form = await db.query.forms.findFirst({ where: eq(forms.id, params.formId) });
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const access = await checkGuildAccess(form.guildId);
  if (!access.ok) return NextResponse.json({ error: "Forbidden" }, { status: access.status });

  const parsed = upsertSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", issues: parsed.error.issues }, { status: 400 });
  }

  const existing = await db.query.integrations.findFirst({
    where: and(eq(integrations.formId, params.formId), eq(integrations.type, parsed.data.type)),
  });

  const [integration] = existing
    ? await db
        .update(integrations)
        .set({ config: parsed.data.config, enabled: parsed.data.enabled })
        .where(eq(integrations.id, existing.id))
        .returning()
    : await db
        .insert(integrations)
        .values({
          formId: form.id,
          guildId: form.guildId,
          type: parsed.data.type,
          config: parsed.data.config,
          enabled: parsed.data.enabled,
        })
        .returning();

  return NextResponse.json(integration);
}
