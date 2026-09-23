import type { WebSubmissionActionRow, WebSubmissionEmbed } from "@discord-forms/shared";

/**
 * Posts straight to a Discord channel via REST, using the same bot token the
 * dashboard already uses read-only (see discordBot.ts). The web app has no gateway
 * connection — but Discord doesn't care who posts a message via REST vs. the
 * gateway, and a message's buttons stay fully interactive either way (clicks route
 * through Discord to whichever process is connected with matching custom_ids,
 * which is the bot's interactionCreate.ts).
 *
 * This is only the *first* attempt at delivering a web-form submission: the submit
 * route saves the submission before calling this, and anything that fails with a
 * RetryableDeliveryError is left PENDING for the bot's delivery poller
 * (apps/bot/src/deliveryPoller.ts), which retries through discord.js's
 * rate-limit-aware REST queue. So this deliberately doesn't wait out long 429s —
 * a serverless request is the wrong place to sleep.
 */
const DISCORD_API = "https://discord.com/api/v10";
const REQUEST_TIMEOUT_MS = 8_000;
/** A 429 asking us to wait longer than this is handed off to the bot rather than slept through. */
const MAX_INLINE_RETRY_WAIT_MS = 2_000;

export interface DiscordImageFile {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
}

/** Worth trying again later: rate limits, timeouts, network errors, Discord 5xx. */
export class RetryableDeliveryError extends Error {}
/** Won't fix itself by waiting: bad/deleted channel, missing access, malformed payload. */
export class PermanentDeliveryError extends Error {}

function botToken(): string {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) throw new Error("DISCORD_BOT_TOKEN is not set");
  return token;
}

function buildBody(
  payload: { embeds: WebSubmissionEmbed[]; components?: WebSubmissionActionRow[] },
  images: DiscordImageFile[],
): { body: BodyInit; headers: Record<string, string> } {
  const headers: Record<string, string> = { Authorization: `Bot ${botToken()}` };
  if (images.length === 0) {
    headers["Content-Type"] = "application/json";
    return { body: JSON.stringify(payload), headers };
  }
  const form = new FormData();
  form.append("payload_json", JSON.stringify(payload));
  images.forEach((img, i) => {
    form.append(`files[${i}]`, new Blob([new Uint8Array(img.buffer)], { type: img.mimeType }), img.fileName);
  });
  return { body: form, headers };
}

export async function postDiscordMessage(
  channelId: string,
  payload: { embeds: WebSubmissionEmbed[]; components?: WebSubmissionActionRow[] },
  images: DiscordImageFile[],
): Promise<{ messageId: string }> {
  for (let attempt = 0; ; attempt++) {
    // Rebuilt per attempt — a FormData body can't be safely re-sent after a fetch consumed it.
    const { body, headers } = buildBody(payload, images);

    let res: Response;
    try {
      res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (err) {
      throw new RetryableDeliveryError(`Discord request failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    if (res.ok) {
      const data = (await res.json()) as { id: string };
      return { messageId: data.id };
    }

    const detail = await res.text().catch(() => "");

    if (res.status === 429) {
      let retryAfterMs = Number.POSITIVE_INFINITY;
      try {
        retryAfterMs = Number((JSON.parse(detail) as { retry_after?: number }).retry_after) * 1000;
      } catch {
        // Non-JSON 429 (e.g. a Cloudflare ban page) — never worth waiting inline for.
      }
      const scope = res.headers.get("x-ratelimit-global") ? "global" : (res.headers.get("x-ratelimit-scope") ?? "route");
      console.warn(`[discordDelivery] 429 (${scope}) posting to ${channelId}, retry_after=${retryAfterMs}ms`);
      if (attempt === 0 && Number.isFinite(retryAfterMs) && retryAfterMs <= MAX_INLINE_RETRY_WAIT_MS) {
        await new Promise((resolve) => setTimeout(resolve, retryAfterMs + 100));
        continue;
      }
      throw new RetryableDeliveryError(`Rate limited by Discord (${scope}), retry_after=${retryAfterMs}ms`);
    }

    const message = `Discord message post failed (${res.status}): ${detail.slice(0, 300)}`;
    if (res.status >= 500) throw new RetryableDeliveryError(message);
    throw new PermanentDeliveryError(message);
  }
}
