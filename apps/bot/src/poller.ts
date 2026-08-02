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
 */
export function startPanelPoller(client: BotClient) {
  const tick = async () => {
    try {
      const pendingPanels = await prisma.panel.findMany({
        where: { messageId: null },
        include: { buttons: { orderBy: { sortOrder: "asc" } } },
      });

      for (const panel of pendingPanels) {
        try {
          await postPanelMessage(client, panel);
        } catch (err) {
          console.error(`[poller] failed to post panel ${panel.id}:`, err);
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
