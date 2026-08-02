"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@discord-forms/db";
import { prisma } from "@/lib/db";
import { requireGuildAccess } from "@/lib/guildAccess";

export async function createFormAction(formData: FormData) {
  const guildId = String(formData.get("guildId"));
  const name = String(formData.get("name") ?? "").trim();
  await requireGuildAccess(guildId);
  if (!name) return;

  await prisma.guild.upsert({ where: { guildId }, update: {}, create: { guildId } });
  const form = await prisma.form.create({ data: { guildId, name, fields: [] } });
  redirect(`/dashboard/${guildId}/forms/${form.id}`);
}

export async function duplicateFormAction(formData: FormData) {
  const guildId = String(formData.get("guildId"));
  const formId = String(formData.get("formId"));
  await requireGuildAccess(guildId);

  const source = await prisma.form.findFirst({
    where: { id: formId, guildId },
    include: { integrations: true },
  });
  if (!source) return;

  const copy = await prisma.form.create({
    data: {
      guildId,
      name: `${source.name} (copy)`,
      description: source.description,
      fields: source.fields as Prisma.InputJsonValue,
      reviewChannelId: source.reviewChannelId,
      outputChannelId: source.outputChannelId,
      integrations: {
        create: source.integrations.map((i) => ({
          guildId,
          type: i.type,
          config: i.config as Prisma.InputJsonValue,
          enabled: i.enabled,
        })),
      },
    },
  });

  redirect(`/dashboard/${guildId}/forms/${copy.id}`);
}

export async function deleteFormAction(formData: FormData) {
  const guildId = String(formData.get("guildId"));
  const formId = String(formData.get("formId"));
  await requireGuildAccess(guildId);
  await prisma.form.delete({ where: { id: formId } });
  revalidatePath(`/dashboard/${guildId}/forms`);
}
