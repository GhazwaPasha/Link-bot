import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, TextChannel } from "discord.js";
import { prisma, type Panel, type PanelButton, type PanelButtonStyle } from "@discord-forms/db";
import { CustomId } from "../customIds";

const STYLE_MAP: Record<PanelButtonStyle, ButtonStyle> = {
  PRIMARY: ButtonStyle.Primary,
  SECONDARY: ButtonStyle.Secondary,
  SUCCESS: ButtonStyle.Success,
  DANGER: ButtonStyle.Danger,
};

const BUTTONS_PER_ROW = 5;

export function buildPanelComponents(buttons: PanelButton[]) {
  const sorted = [...buttons].sort((a, b) => a.sortOrder - b.sortOrder);
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];

  for (let i = 0; i < sorted.length; i += BUTTONS_PER_ROW) {
    const chunk = sorted.slice(i, i + BUTTONS_PER_ROW);
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      chunk.map((button) => {
        const b = new ButtonBuilder()
          .setCustomId(CustomId.panelSubmit(button.id))
          .setLabel(button.label || "Submit")
          .setStyle(STYLE_MAP[button.style]);
        if (button.emoji) b.setEmoji(button.emoji);
        return b;
      }),
    );
    rows.push(row);
  }

  return rows;
}

/** Posts (or re-posts) a panel's button message to its target channel, then stores the message id. */
export async function postPanelMessage(client: Client, panel: Panel & { buttons: PanelButton[] }) {
  const channel = await client.channels.fetch(panel.postChannelId).catch(() => null);
  if (!channel || !(channel instanceof TextChannel)) {
    throw new Error(`Panel ${panel.id}: channel ${panel.postChannelId} not found or not a text channel`);
  }

  const message = await channel.send({
    embeds: [
      {
        title: panel.name,
        description: panel.description ?? undefined,
        color: 0x6366f1,
      },
    ],
    components: buildPanelComponents(panel.buttons),
  });

  await prisma.panel.update({
    where: { id: panel.id },
    data: { messageId: message.id },
  });

  return message;
}
