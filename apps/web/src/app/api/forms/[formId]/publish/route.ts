import { NextResponse, type NextRequest } from "next/server";
import { formFieldsSchema, validateFormFields } from "@discord-forms/shared";
import { prisma } from "@/lib/db";
import { checkGuildAccess } from "@/lib/apiAuth";

export async function POST(_req: NextRequest, { params }: { params: { formId: string } }) {
  const form = await prisma.form.findUnique({ where: { id: params.formId } });
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const access = await checkGuildAccess(form.guildId);
  if (!access.ok) return NextResponse.json({ error: "Forbidden" }, { status: access.status });

  const fields = formFieldsSchema.parse(form.fields);
  if (fields.length === 0) {
    return NextResponse.json({ error: "Add at least one field before publishing." }, { status: 400 });
  }

  const issues = validateFormFields(fields);
  if (issues.length > 0) {
    return NextResponse.json({ error: "Form has validation issues", issues }, { status: 400 });
  }

  const updated = await prisma.form.update({ where: { id: params.formId }, data: { status: "PUBLISHED" } });
  return NextResponse.json(updated);
}
