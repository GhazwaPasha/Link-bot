import { Events, type Interaction } from "discord.js";
import type { BotClient } from "../client";
import { parseCustomId } from "../customIds";
import { handlePanelSubmit, handleSessionContinue, handleSessionModalSubmit, handleSessionSelect } from "../flows/submissionFlow";
import { handleSubmissionApprove, handleSubmissionReject } from "../flows/reviewFlow";

export function registerInteractionCreate(client: BotClient) {
  client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    try {
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        await command.execute(interaction);
        return;
      }

      // Every branch below must be `await`ed, not just `return`ed — `return
      // somePromise()` inside a try block hands control back to the caller
      // immediately without the try/catch ever seeing a later rejection. That
      // gap let an ordinary timed-out interaction (10062, expected whenever a
      // click barely misses Discord's 3s window) turn into an unhandled
      // rejection, which crashed the *entire* bot process (discord.js's
      // Client re-emits it as an 'error' event with no listener registered).

      if (interaction.isButton()) {
        const { prefix, args } = parseCustomId(interaction.customId);
        if (prefix === "psub") return await handlePanelSubmit(interaction, args[0]);
        if (prefix === "scon") return await handleSessionContinue(interaction, args[0]);
        if (prefix === "sapp") return await handleSubmissionApprove(interaction, args[0]);
        if (prefix === "srej") return await handleSubmissionReject(interaction, args[0]);
        return;
      }

      if (interaction.isAnySelectMenu()) {
        const { prefix, args } = parseCustomId(interaction.customId);
        if (prefix === "ssel") return await handleSessionSelect(interaction, args[0], args[1]);
        return;
      }

      if (interaction.isModalSubmit()) {
        const { prefix, args } = parseCustomId(interaction.customId);
        if (prefix === "smod") return await handleSessionModalSubmit(interaction, args[0]);
        return;
      }
    } catch (err) {
      console.error("Error handling interaction:", err);
      if (!interaction.isRepliable()) return;

      const payload = { content: "Something went wrong handling that.", ephemeral: true };
      if (interaction.deferred && !interaction.replied) {
        await interaction.editReply(payload).catch(() => undefined);
      } else if (interaction.replied) {
        await interaction.followUp(payload).catch(() => undefined);
      } else {
        await interaction.reply(payload).catch(() => undefined);
      }
    }
  });
}
