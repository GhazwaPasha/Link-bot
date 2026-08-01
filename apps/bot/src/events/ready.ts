import { Events } from "discord.js";
import type { BotClient } from "../client";

export function registerReady(client: BotClient) {
  client.once(Events.ClientReady, () => {
    console.log(`Logged in as ${client.user?.tag}`);
  });
}
