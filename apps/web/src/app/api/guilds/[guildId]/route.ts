import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { checkGuildAccess } from "@/lib/apiAuth";

const patchSchema = z.object({
  reviewRoleIds: z.array(z.string()),
});

export async function PATCH(req: NextRequest, { params }: { params: { guildId: string } }) {
  const access = await checkGuildAccess(params.guildId);
  if (!access.ok) return NextResponse.json({ error: "Forbidden" }, { status: access.status });

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", issues: parsed.error.issues }, { status: 400 });
  }

  const guild = await prisma.guild.upsert({
    where: { guildId: params.guildId },
    update: { reviewRoleIds: parsed.data.reviewRoleIds },
    create: { guildId: params.guildId, reviewRoleIds: parsed.data.reviewRoleIds },
  });

  return NextResponse.json(guild);
}
