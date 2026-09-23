import { monitorEventLoopDelay } from "node:perf_hooks";
import { Events, RESTEvents, Status } from "discord.js";
import type { BotClient } from "./client";

/**
 * Everything that used to fail silently. The 2026-09 "application didn't respond"
 * incident looked exactly like the earlier rate-limit ban from the outside, but was
 * really the VM thrashing swap: the event loop froze, heartbeats and interaction
 * acks went out late, and the gateway session quietly dropped and re-IDENTIFYed —
 * none of which discord.js logs by default. With these lines, the journal says
 * which one it is (rate limit vs. stall vs. gateway churn) within seconds.
 */

const STALL_LOG_THRESHOLD_MS = 1_000;
const STALL_CHECK_INTERVAL_MS = 10_000;
/** A stall this long within the recent window makes /health report unhealthy. */
const UNHEALTHY_STALL_MS = 5_000;
const UNHEALTHY_STALL_WINDOW_MS = 60_000;

let lastStallMs = 0;
let lastStallAt = 0;
let clientRef: BotClient | null = null;

export function registerTelemetry(client: BotClient) {
  clientRef = client;

  // --- Gateway lifecycle ---------------------------------------------------
  // ShardReady fires on every fresh IDENTIFY (not on RESUME) — each one spends
  // from Discord's 1000/day session_start_limit, so a burst of these is the
  // early warning for the reconnect-loop ban we hit before.
  client.on(Events.ShardReady, (shardId, unavailableGuilds) => {
    console.log(`[gateway] shard ${shardId} READY (new session / IDENTIFY), unavailable guilds: ${unavailableGuilds?.size ?? 0}`);
  });
  client.on(Events.ShardResume, (shardId, replayedEvents) => {
    console.log(`[gateway] shard ${shardId} RESUMED, replayed ${replayedEvents} event(s)`);
  });
  client.on(Events.ShardDisconnect, (event, shardId) => {
    console.warn(`[gateway] shard ${shardId} DISCONNECTED code=${event.code}`);
  });
  client.on(Events.ShardReconnecting, (shardId) => {
    console.warn(`[gateway] shard ${shardId} reconnecting`);
  });
  client.on(Events.ShardError, (err, shardId) => {
    console.error(`[gateway] shard ${shardId} error:`, err);
  });
  client.on(Events.Invalidated, () => {
    console.error("[gateway] session invalidated");
  });

  // --- REST rate limits ----------------------------------------------------
  // discord.js already queues and waits these out on its own; logging them is
  // what makes "are we being rate limited?" answerable from the journal.
  client.rest.on(RESTEvents.RateLimited, (info) => {
    console.warn(
      `[rest] rate limited: ${info.method} ${info.route} scope=${info.scope} global=${info.global} ` +
        `retryAfter=${info.retryAfter}ms limit=${info.limit}`,
    );
  });
  // Discord bans an IP (Cloudflare-level, ~1h) after 10,000 401/403/429s in 10 minutes.
  client.rest.on(RESTEvents.InvalidRequestWarning, (info) => {
    console.warn(`[rest] invalid request warning: ${info.count} invalid requests, window resets in ${info.remainingTime}ms`);
  });

  // --- Event-loop stalls ---------------------------------------------------
  const histogram = monitorEventLoopDelay({ resolution: 20 });
  histogram.enable();
  const interval = setInterval(() => {
    const maxMs = Math.round(histogram.max / 1e6);
    histogram.reset();
    if (maxMs >= STALL_LOG_THRESHOLD_MS) {
      lastStallMs = maxMs;
      lastStallAt = Date.now();
      console.warn(`[telemetry] event loop stalled for up to ${maxMs}ms in the last ${STALL_CHECK_INTERVAL_MS / 1000}s`);
    }
  }, STALL_CHECK_INTERVAL_MS);
  interval.unref();
}

export interface HealthSnapshot {
  healthy: boolean;
  gateway: string;
  wsPingMs: number | null;
  lastStallMs: number;
  lastStallAgoMs: number | null;
}

export function getHealth(): HealthSnapshot {
  const status = clientRef?.ws.status;
  const gatewayReady = status === Status.Ready;
  const recentBadStall = lastStallMs >= UNHEALTHY_STALL_MS && Date.now() - lastStallAt < UNHEALTHY_STALL_WINDOW_MS;
  return {
    healthy: gatewayReady && !recentBadStall,
    gateway: status === undefined ? "not-started" : (Status[status] ?? String(status)),
    wsPingMs: clientRef && clientRef.ws.ping >= 0 ? clientRef.ws.ping : null,
    lastStallMs,
    lastStallAgoMs: lastStallAt ? Date.now() - lastStallAt : null,
  };
}
