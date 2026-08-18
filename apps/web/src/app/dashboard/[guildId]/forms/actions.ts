"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { forms, guilds, integrations } from "@discord-forms/db";
import { and, eq } from "drizzle-orm";
import { requireGuildAccess } from "@/lib/guildAccess";

export async function createFormAction(formData: FormData) {
  const guildId = String(formData.get("guildId"));
  const name = String(formData.get("name") ?? "").trim();
  await requireGuildAccess(guildId);
  if (!name) return;

  await db.insert(guilds).values({ guildId }).onConflictDoNothing({ target: guilds.guildId });
  const [form] = await db.insert(forms).values({ guildId, name, fields: [] }).returning();
  redirect(`/dashboard/${guildId}/forms/${form.id}`);
}

export async function duplicateFormAction(formData: FormData) {
  const guildId = String(formData.get("guildId"));
  const formId = String(formData.get("formId"));
  await requireGuildAccess(guildId);

  const source = await db.query.forms.findFirst({
    where: and(eq(forms.id, formId), eq(forms.guildId, guildId)),
    with: { integrations: true },
  });
  if (!source) return;

  const copy = await db.transaction(async (tx) => {
    const [copyRow] = await tx
      .insert(forms)
      .values({
        guildId,
        name: `${source.name} (copy)`,
        description: source.description,
        fields: source.fields,
        reviewChannelId: source.reviewChannelId,
        outputChannelId: source.outputChannelId,
      })
      .returning();
    if (source.integrations.length > 0) {
      await tx.insert(integrations).values(
        source.integrations.map((i) => ({
          guildId,
          formId: copyRow.id,
          type: i.type,
          config: i.config,
          enabled: i.enabled,
        })),
      );
    }
    return copyRow;
  });

  redirect(`/dashboard/${guildId}/forms/${copy.id}`);
}

export async function deleteFormAction(formData: FormData) {
  const guildId = String(formData.get("guildId"));
  const formId = String(formData.get("formId"));
  await requireGuildAccess(guildId);
  await db.delete(forms).where(eq(forms.id, formId));
  revalidatePath(`/dashboard/${guildId}/forms`);
}
