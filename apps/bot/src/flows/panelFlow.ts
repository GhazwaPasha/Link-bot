import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, TextChannel } from "discord.js";
import { prisma, type Panel, type Form } from "@discord-forms/db";
import { CustomId } from "../customIds";

export function buildPanelComponents(panel: Panel) {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(CustomId.panelSubmit(panel.id))
      .setLabel(panel.buttonLabel || "Submit")
      .setStyle(ButtonStyle.Primary),
  );
  return [row];
}

/** Posts (or re-posts) a panel's button message to its target channel, then stores the message id. */
export async function postPanelMessage(client: Client, panel: Panel, form: Form) {
  const channel = await client.channels.fetch(panel.postChannelId).catch(() => null);
  if (!channel || !(channel instanceof TextChannel)) {
    throw new Error(`Panel ${panel.id}: channel ${panel.postChannelId} not found or not a text channel`);
  }

  const message = await channel.send({
    embeds: [
      {
        title: form.name,
        description: form.description ?? undefined,
        color: 0x6366f1,
      },
    ],
    components: buildPanelComponents(panel),
  });

  await prisma.panel.update({
    where: { id: panel.id },
    data: { messageId: message.id },
  });

  return message;
}
