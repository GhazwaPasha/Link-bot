import { prisma } from "@discord-forms/db";
import type { BotClient } from "./client";
import { postPanelMessage } from "./flows/panelFlow";
import { env } from "./env";

/**
 * Panels created from the web dashboard only get a DB row (the bot process is the
 * only thing holding a live gateway connection, so it's the only thing that can
 * actually send the message). This poller picks up any panel still missing a
 * messageId and posts it, which also covers slash-command-created panels that
 * fail transiently.
 *
 * A panel gets exactly one attempt per failure, not infinite retries: a bad
 * channel id or a guild we're no longer in fails every single time, so retrying
 * forever just spams the logs on every tick without ever succeeding. Instead we
 * record the failure (failedAt/lastError) and stop touching it — the dashboard
 * shows it as "Failed" and a person can explicitly retry it, which clears
 * failedAt and lets this poller pick it up again on the next tick.
 */
export function startPanelPoller(client: BotClient) {
  const tick = async () => {
    try {
      const pendingPanels = await prisma.panel.findMany({
        where: { messageId: null, failedAt: null },
        include: { buttons: { orderBy: { sortOrder: "asc" } }, guild: { select: { leftAt: true } } },
      });

      for (const panel of pendingPanels) {
        // Known-doomed without even asking Discord: we're not in this guild anymore.
        const failMessage = panel.guild.leftAt
          ? "Bot is no longer a member of this server"
          : null;

        try {
          if (failMessage) throw new Error(failMessage);
          await postPanelMessage(client, panel);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(`[poller] failed to post panel ${panel.id}: ${message}`);
          await prisma.panel
            .update({ where: { id: panel.id }, data: { failedAt: new Date(), lastError: message } })
            .catch((updateErr) => console.error(`[poller] failed to record failure for panel ${panel.id}:`, updateErr));
        }
      }
    } catch (err) {
      console.error("[poller] tick failed:", err);
    }
  };

  tick();
  const interval = setInterval(tick, env.PANEL_POLL_INTERVAL_MS);
  interval.unref();
}
