import { REST, Routes } from "discord.js";
import { env } from "./env";
import { commandData } from "./commands";

async function main() {
  const rest = new REST().setToken(env.DISCORD_TOKEN);
  const body = commandData.map((c) => c.toJSON());

  console.log(`Registering ${body.length} global command(s)...`);
  await rest.put(Routes.applicationCommands(env.DISCORD_CLIENT_ID), { body });
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
