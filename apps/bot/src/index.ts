import { env } from "./env";
import { createClient } from "./client";
import { commands } from "./commands";
import { registerReady } from "./events/ready";
import { registerGuildCreate } from "./events/guildCreate";
import { registerGuildDelete } from "./events/guildDelete";
import { registerInteractionCreate } from "./events/interactionCreate";
import { startPanelPoller } from "./poller";
import { startHealthServer } from "./health";

async function main() {
  startHealthServer();

  const client = createClient();

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
