import { NextResponse, type NextRequest } from "next/server";
import { createId } from "@paralleldrive/cuid2";
import { db } from "@/lib/db";
import { forms, submissionFiles, submissions } from "@discord-forms/db";
import { eq, and, gte, sql } from "drizzle-orm";
import { buildWebSubmissionMessage, formFieldsSchema } from "@discord-forms/shared";
import { PermanentDeliveryError, postDiscordMessage, type DiscordImageFile } from "@/lib/discordDelivery";
import { runIntegrations } from "@/lib/runIntegrations";

/** Bots that fill in every visible field trip this — it's never rendered for a real visitor (see PublicFormRenderer). */
const HONEYPOT_FIELD = "_hp";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
/** Generous on purpose — a shared office/restaurant IP behind NAT can legitimately produce many submissions in a burst. This only needs to stop scripted flooding. */
const RATE_LIMIT_MAX = 50;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
/**
 * How long the bot's delivery poller leaves a fresh submission alone, so it can't
 * race this request's own attempt. Must stay above maxDuration: once the function
 * is guaranteed dead, the row is safe for the poller to take over.
 */
const INLINE_DELIVERY_GRACE_MS = 45_000;

// Worst case for the inline Discord attempt is ~2 x 8s timeouts plus a short 429 wait.
export const maxDuration = 30;

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

  const autoApprove = !form.reviewChannelId;
  const submissionId = createId();
  const submittedAt = new Date();
  const message = buildWebSubmissionMessage(form, fields, answers, submissionId, submittedAt);

  // Save first, deliver second — a Discord outage, 429 or timeout must never lose a
  // submission. If the immediate attempt below doesn't land, the row stays PENDING
  // and the bot's delivery poller (apps/bot/src/deliveryPoller.ts) picks it up once
  // deliveryNextAttemptAt passes. That's set in the future *before* our own attempt
  // starts, so the poller can't grab the row while this request is still posting it.
  const submission = await db.transaction(async (tx) => {
    const [row] = await tx
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
        outputChannelId: form.outputChannelId,
        reviewedAt: autoApprove ? submittedAt : null,
        deliveryStatus: message ? "PENDING" : "DELIVERED",
        deliveryNextAttemptAt: message ? new Date(Date.now() + INLINE_DELIVERY_GRACE_MS) : null,
        createdAt: submittedAt,
      })
      .returning();
    if (message && images.length > 0) {
      await tx.insert(submissionFiles).values(
        images.map((img) => ({ submissionId, fileName: img.fileName, mimeType: img.mimeType, data: img.buffer })),
      );
    }
    return row;
  });

  if (!message) {
    // Auto-approve with no output channel: nothing to post, the submission is done.
    await runIntegrations(form, submission);
    return NextResponse.json({ ok: true, submissionId });
  }

  try {
    const posted = await postDiscordMessage(
      message.channelId,
      { embeds: message.embeds, components: message.components },
      images,
    );
    const [delivered] = await db
      .update(submissions)
      .set({
        deliveryStatus: "DELIVERED",
        deliveryAttempts: 1,
        deliveryLastError: null,
        deliveryNextAttemptAt: null,
        reviewMessageId: autoApprove ? null : posted.messageId,
      })
      .where(and(eq(submissions.id, submissionId), eq(submissions.deliveryStatus, "PENDING")))
      .returning();
    await db.delete(submissionFiles).where(eq(submissionFiles.submissionId, submissionId));
    if (delivered && autoApprove) {
      await runIntegrations(form, delivered);
    }
  } catch (err) {
    const permanent = err instanceof PermanentDeliveryError;
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(
      `[submit] form ${form.id} submission ${submissionId} not delivered (${permanent ? "permanent" : "queued for retry"}):`,
      errorMessage,
    );
    await db
      .update(submissions)
      .set({
        deliveryStatus: permanent ? "FAILED" : "PENDING",
        deliveryAttempts: 1,
        deliveryLastError: errorMessage.slice(0, 500),
      })
      .where(and(eq(submissions.id, submissionId), eq(submissions.deliveryStatus, "PENDING")))
      .catch((updateErr) => console.error(`[submit] failed to record delivery failure for ${submissionId}:`, updateErr));
  }

  // The submission is saved either way — the submitter shouldn't see an error for a
  // Discord-side problem that the retry queue (or a dashboard retry) will resolve.
  return NextResponse.json({ ok: true, submissionId });
}
