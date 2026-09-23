import { AttachmentBuilder, DiscordAPIError, type MessageCreateOptions } from "discord.js";
import { db, submissionFiles, submissions } from "@discord-forms/db";
import { and, eq, sql } from "drizzle-orm";
import { buildWebSubmissionMessage, formFieldsSchema } from "@discord-forms/shared";
import type { BotClient } from "./client";
import { env } from "./env";
import { runIntegrations } from "./integrations";

/**
 * Drains the web-form delivery outbox. The public submit route saves a submission
 * before trying to post it (apps/web/.../submit/route.ts); anything its one
 * immediate attempt couldn't deliver — a 429, a timeout, a Discord 5xx — is left
 * PENDING with a deliveryNextAttemptAt, and lands here. Posting through discord.js
 * means rate limits are queued and waited out properly (@discordjs/rest), which a
 * serverless request can't do.
 *
 * Same failure philosophy as the panel poller (poller.ts): retry what can recover,
 * and mark FAILED — visible on the dashboard with a Retry button — what can't,
 * rather than retrying a deleted channel forever.
 */

const BATCH_SIZE = 10;
/** A claimed row is invisible to other ticks this long — covers a crash mid-delivery. */
const CLAIM_LEASE = "2 minutes";
const MAX_ATTEMPTS = 8;
const BASE_BACKOFF_MS = 30_000;
const MAX_BACKOFF_MS = 30 * 60_000;

/** Discord API error codes that waiting won't fix. */
const PERMANENT_DISCORD_CODES = new Set([
  10003, // Unknown Channel
  10004, // Unknown Guild
  50001, // Missing Access
  50013, // Missing Permissions
  50035, // Invalid Form Body
]);

class PermanentError extends Error {}

function isPermanent(err: unknown): boolean {
  if (err instanceof PermanentError) return true;
  if (err instanceof DiscordAPIError) {
    if (typeof err.code === "number" && PERMANENT_DISCORD_CODES.has(err.code)) return true;
    return err.status >= 400 && err.status < 500 && err.status !== 429;
  }
  return false;
}

async function claimDueSubmissions(): Promise<string[]> {
  // FOR UPDATE SKIP LOCKED + pushing next_attempt_at forward in the same
  // statement means a row is only ever taken by one tick (or one process).
  const rows = await db.execute<{ id: string }>(sql`
    update ${submissions}
    set delivery_next_attempt_at = now() + ${CLAIM_LEASE}::interval
    where id in (
      select id from ${submissions}
      where delivery_status = 'PENDING'
        and (delivery_next_attempt_at is null or delivery_next_attempt_at <= now())
      order by created_at
      limit ${BATCH_SIZE}
      for update skip locked
    )
    returning id
  `);
  return [...rows].map((r) => r.id);
}

async function deliver(client: BotClient, submissionId: string) {
  const submission = await db.query.submissions.findFirst({
    where: eq(submissions.id, submissionId),
    with: { form: true, files: true, guild: { columns: { leftAt: true } } },
  });
  if (!submission || submission.deliveryStatus !== "PENDING") return;

  const attempts = submission.deliveryAttempts + 1;

  try {
    if (submission.guild.leftAt) throw new PermanentError("Bot is no longer a member of this server");

    const fields = formFieldsSchema.parse(submission.form.fields);
    // Built from the submission's own snapshot of channels, so a retry lands where
    // the original attempt was aimed even if the form's settings changed since.
    const message = buildWebSubmissionMessage(
      { ...submission.form, reviewChannelId: submission.reviewChannelId, outputChannelId: submission.outputChannelId },
      fields,
      submission.answers,
      submission.id,
      submission.createdAt,
    );

    let reviewMessageId: string | null = null;
    if (message) {
      const channel = await client.channels.fetch(message.channelId).catch((err) => {
        if (isPermanent(err)) throw new PermanentError(`Channel ${message.channelId} is unavailable: ${err.message}`);
        throw err;
      });
      if (!channel || !channel.isSendable()) {
        throw new PermanentError(`Channel ${message.channelId} not found or not a text channel`);
      }
      const sent = await channel.send({
        embeds: message.embeds,
        components: message.components as MessageCreateOptions["components"],
        files: submission.files.map((f) => new AttachmentBuilder(f.data, { name: f.fileName })),
      });
      if (submission.reviewChannelId) reviewMessageId = sent.id;
    }

    const [delivered] = await db
      .update(submissions)
      .set({ deliveryStatus: "DELIVERED", deliveryAttempts: attempts, deliveryLastError: null, deliveryNextAttemptAt: null, reviewMessageId })
      .where(and(eq(submissions.id, submissionId), eq(submissions.deliveryStatus, "PENDING")))
      .returning();
    await db.delete(submissionFiles).where(eq(submissionFiles.submissionId, submissionId));
    console.log(`[delivery] delivered web submission ${submissionId} on attempt ${attempts}`);

    // Auto-approved submissions run integrations on delivery — the web route skips
    // them when its own attempt failed, so they run exactly once, here.
    if (delivered && !submission.reviewChannelId) {
      await runIntegrations(submission.form, delivered);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const giveUp = isPermanent(err) || attempts >= MAX_ATTEMPTS;
    const backoffMs = Math.min(BASE_BACKOFF_MS * 2 ** attempts, MAX_BACKOFF_MS);
    console.error(
      `[delivery] web submission ${submissionId} attempt ${attempts} failed${giveUp ? " — marking FAILED" : `, retrying in ${backoffMs / 1000}s`}: ${message}`,
    );
    await db
      .update(submissions)
      .set({
        deliveryStatus: giveUp ? "FAILED" : "PENDING",
        deliveryAttempts: attempts,
        deliveryLastError: message.slice(0, 500),
        deliveryNextAttemptAt: giveUp ? null : new Date(Date.now() + backoffMs),
      })
      .where(and(eq(submissions.id, submissionId), eq(submissions.deliveryStatus, "PENDING")));
  }
}

export function startDeliveryPoller(client: BotClient) {
  let running = false;

  const tick = async () => {
    // A slow batch (e.g. discord.js waiting out a rate limit) must not overlap the next tick.
    if (running) return;
    running = true;
    try {
      const ids = await claimDueSubmissions();
      for (const id of ids) {
        await deliver(client, id).catch((err) => console.error(`[delivery] unexpected error for ${id}:`, err));
      }
    } catch (err) {
      console.error("[delivery] tick failed:", err);
    } finally {
      running = false;
    }
  };

  tick();
  const interval = setInterval(tick, env.PANEL_POLL_INTERVAL_MS);
  interval.unref();
}
