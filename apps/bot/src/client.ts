import { Client, Collection, GatewayIntentBits, type ChatInputCommandInteraction } from "discord.js";

export interface Command {
  name: string;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export class BotClient extends Client {
  commands = new Collection<string, Command>();
}

export function createClient() {
  return new BotClient({
    intents: [GatewayIntentBits.Guilds],
  });
}
