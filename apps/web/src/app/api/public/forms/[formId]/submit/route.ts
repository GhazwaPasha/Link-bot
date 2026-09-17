import { NextResponse, type NextRequest } from "next/server";
import { createId } from "@paralleldrive/cuid2";
import { db } from "@/lib/db";
import { forms, submissions } from "@discord-forms/db";
import { eq, and, gte, sql } from "drizzle-orm";
import { CustomId, formatAnswerValue, formFieldsSchema } from "@discord-forms/shared";
import { postDiscordMessage, type DiscordImageFile } from "@/lib/discordDelivery";
import { runIntegrations } from "@/lib/runIntegrations";

/** Bots that fill in every visible field trip this — it's never rendered for a real visitor (see PublicFormRenderer). */
const HONEYPOT_FIELD = "_hp";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
/** Generous on purpose — a shared office/restaurant IP behind NAT can legitimately produce many submissions in a burst. This only needs to stop scripted flooding. */
const RATE_LIMIT_MAX = 50;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(req: NextRequest, { params }: { params: { formId: string } }) {
  const form = await db.query.forms.findFirst({ where: eq(forms.id, params.formId) });
  if (!form || !form.webFormEnabled) {
    return NextResponse.json({ error: "This form isn't available." }, { status: 404 });
  }

  const formData = await req.formData();

  if (formData.get(HONEYPOT_FIELD)) {
    // Don't tip off the bot — pretend it worked.
    return NextResponse.json({ ok: true });
  }

  const ip = getClientIp(req);
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(submissions)
    .where(
      and(
        eq(submissions.formId, form.id),
        eq(submissions.ip, ip),
        gte(submissions.createdAt, new Date(Date.now() - RATE_LIMIT_WINDOW_MS)),
      ),
    );
  if (count >= RATE_LIMIT_MAX) {
    return NextResponse.json({ error: "Too many submissions from this network — please try again later." }, { status: 429 });
  }

  const fields = formFieldsSchema.parse(form.fields);
  const answers: Record<string, string> = {};
  const images: DiscordImageFile[] = [];

  for (const field of fields) {
    if (field.type === "image") {
      const file = formData.get(field.id);
      if (file instanceof File && file.size > 0) {
        if (file.size > MAX_IMAGE_BYTES) {
          return NextResponse.json({ error: `"${field.label}" is larger than the 5MB limit.` }, { status: 400 });
        }
        if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
          return NextResponse.json({ error: `"${field.label}" must be a PNG, JPEG, WebP, or GIF image.` }, { status: 400 });
        }
        images.push({ buffer: Buffer.from(await file.arrayBuffer()), fileName: file.name, mimeType: file.type });
      } else if (field.required) {
        return NextResponse.json({ error: `"${field.label}" is required.` }, { status: 400 });
      }
      continue;
    }

    if (field.type === "checkbox") {
      const values = formData.getAll(field.id).map(String).filter(Boolean);
      if (field.required && values.length === 0) {
        return NextResponse.json({ error: `"${field.label}" is required.` }, { status: 400 });
      }
      answers[field.id] = values.join(",");
      continue;
    }

    const raw = formData.get(field.id);
    const value = typeof raw === "string" ? raw.trim() : "";
    if (field.required && !value) {
      return NextResponse.json({ error: `"${field.label}" is required.` }, { status: 400 });
    }
    answers[field.id] = value;
  }

  const embed = {
    title: form.name,
    description: "Submitted via the public web form",
    color: 0x6366f1,
    fields: fields
      .filter((f) => f.type !== "image")
      .map((f) => ({ name: f.label, value: formatAnswerValue(f, answers[f.id]), inline: false })),
    timestamp: new Date().toISOString(),
  };

  const autoApprove = !form.reviewChannelId;
  const submissionId = createId();
  let reviewMessageId: string | null = null;

  try {
    if (autoApprove) {
      if (form.outputChannelId) {
        await postDiscordMessage(form.outputChannelId, { embeds: [embed] }, images);
      }
    } else {
      const components = [
        {
          type: 1 as const,
          components: [
            { type: 2 as const, style: 3, label: form.approveButtonLabel, custom_id: CustomId.submissionApprove(submissionId) },
            { type: 2 as const, style: 4, label: form.rejectButtonLabel, custom_id: CustomId.submissionReject(submissionId) },
          ],
        },
      ];
      const posted = await postDiscordMessage(form.reviewChannelId!, { embeds: [embed], components }, images);
      reviewMessageId = posted.messageId;
    }
  } catch (err) {
    console.error(`[submit] failed to deliver form ${form.id} submission to Discord:`, err);
    return NextResponse.json({ error: "Failed to deliver to Discord — please try again." }, { status: 502 });
  }

  const [submission] = await db
    .insert(submissions)
    .values({
      id: submissionId,
      formId: form.id,
      guildId: form.guildId,
      userId: "web",
      answers,
      status: autoApprove ? "APPROVED" : "PENDING",
      source: "WEB",
      ip,
      reviewChannelId: form.reviewChannelId,
      reviewMessageId,
      outputChannelId: form.outputChannelId,
      reviewedAt: autoApprove ? new Date() : null,
    })
    .returning();

  if (autoApprove) {
    await runIntegrations(form, submission);
  }

  return NextResponse.json({ ok: true, submissionId: submission.id });
}
