import { Events } from "discord.js";
import { env } from "./env";
import { createClient } from "./client";
import { commands } from "./commands";
import { registerReady } from "./events/ready";
import { registerGuildCreate } from "./events/guildCreate";
import { registerGuildDelete } from "./events/guildDelete";
import { registerInteractionCreate } from "./events/interactionCreate";
import { startPanelPoller } from "./poller";
import { startHealthServer } from "./health";

// discord.js's Client emits async listener rejections as an 'error' event
// (captureRejections) — with no listener for that, Node treats it as
// unhandled and crashes the whole process, taking every user's interactions
// down with it over one bad request. interactionCreate.ts's own try/catch is
// the real fix for interaction handling specifically; this is a last-resort
// net so any other async listener bug degrades to a log line, not an outage.
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});

// Same reasoning, other half of the gap: a synchronous throw anywhere we
// haven't wrapped in try/catch would otherwise still kill the process.
// Every process crash means a full reconnect from zero on the next boot —
// enough of those in a short window is what got this bot's IP rate-limited
// by Discord before, so keeping the process alive through unexpected errors
// isn't just about uptime, it's what keeps us off that list.
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});

async function main() {
  startHealthServer();

  // A fixed floor under how fast we can possibly re-IDENTIFY if the process
  // ever does die and get restarted in a loop for some other reason (OOM, a
  // bug the nets above don't catch, etc.) — cheap insurance, since Discord's
  // abuse detection watches reconnect *rate*, not just volume.
  await new Promise((resolve) => setTimeout(resolve, 3_000));

  const client = createClient();
  client.on(Events.Error, (err) => console.error("Discord client error:", err));

  for (const command of commands) {
    client.commands.set(command.name, command);
  }

  registerReady(client);
  registerGuildCreate(client);
  registerGuildDelete(client);
  registerInteractionCreate(client);

  client.once("ready", () => startPanelPoller(client));

  await client.login(env.DISCORD_TOKEN);
}

main().catch((err) => {
  console.error("Fatal error starting bot:", err);
  process.exit(1);
});
