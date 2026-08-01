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

      if (interaction.isButton()) {
        const { prefix, args } = parseCustomId(interaction.customId);
        if (prefix === "psub") return handlePanelSubmit(interaction, args[0]);
        if (prefix === "scon") return handleSessionContinue(interaction, args[0]);
        if (prefix === "sapp") return handleSubmissionApprove(interaction, args[0]);
        if (prefix === "srej") return handleSubmissionReject(interaction, args[0]);
        return;
      }

      if (interaction.isAnySelectMenu()) {
        const { prefix, args } = parseCustomId(interaction.customId);
        if (prefix === "ssel") return handleSessionSelect(interaction, args[0], args[1]);
        return;
      }

      if (interaction.isModalSubmit()) {
        const { prefix, args } = parseCustomId(interaction.customId);
        if (prefix === "smod") return handleSessionModalSubmit(interaction, args[0]);
        return;
      }
    } catch (err) {
      console.error("Error handling interaction:", err);
      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: "Something went wrong handling that.", ephemeral: true }).catch(() => undefined);
      }
    }
  });
}
