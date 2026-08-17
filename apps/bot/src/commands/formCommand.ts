import {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { prisma } from "@discord-forms/db";
import { formFieldsSchema, validateFormFields } from "@discord-forms/shared";
import type { Command } from "../client";
import { env } from "../env";
import { postPanelMessage } from "../flows/panelFlow";

export const data = new SlashCommandBuilder()
  .setName("form")
  .setDescription("Manage forms for this server")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((sub) =>
    sub
      .setName("create")
      .setDescription("Create a new draft form")
      .addStringOption((opt) => opt.setName("name").setDescription("Form name").setRequired(true)),
  )
  .addSubcommand((sub) => sub.setName("list").setDescription("List this server's forms"))
  .addSubcommand((sub) =>
    sub
      .setName("publish")
      .setDescription("Publish a draft form so it can be attached to a panel")
      .addStringOption((opt) => opt.setName("form_id").setDescription("Form ID (see /form list)").setRequired(true)),
  )
  .addSubcommand((sub) =>
    sub
      .setName("panel")
      .setDescription("Post a button panel for a published form")
      .addStringOption((opt) => opt.setName("form_id").setDescription("Form ID (see /form list)").setRequired(true))
      .addChannelOption((opt) =>
        opt.setName("channel").setDescription("Channel to post the panel in").addChannelTypes(ChannelType.GuildText).setRequired(true),
      )
      .addStringOption((opt) => opt.setName("button_label").setDescription("Button text").setRequired(false)),
  );

async function ensureGuildRow(guildId: string, guildName: string | null, iconUrl: string | null) {
  await prisma.guild.upsert({
    where: { guildId },
    update: { name: guildName ?? undefined, iconUrl: iconUrl ?? undefined },
    create: { guildId, name: guildName ?? undefined, iconUrl: iconUrl ?? undefined },
  });
}

async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.inCachedGuild()) {
    await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
    return;
  }

  // Ack immediately — every branch below does at least one DB round-trip
  // (ensureGuildRow plus its own query), and a single query alone can take
  // 1-3s against our DB, which leaves no margin against Discord's 3s
  // interaction-ack deadline. Every reply below uses editReply instead.
  await interaction.deferReply({ ephemeral: true });

  await ensureGuildRow(interaction.guildId, interaction.guild.name, interaction.guild.iconURL());

  const sub = interaction.options.getSubcommand();

  if (sub === "create") {
    const name = interaction.options.getString("name", true);
    const form = await prisma.form.create({
      data: { guildId: interaction.guildId, name, fields: [] },
    });
    await interaction.editReply({
      content: `Created draft form **${name}** (ID \`${form.id}\`). Finish building it at ${env.DASHBOARD_URL}/dashboard/${interaction.guildId}/forms/${form.id}, then run \`/form publish\`.`,
    });
    return;
  }

  if (sub === "list") {
    const forms = await prisma.form.findMany({ where: { guildId: interaction.guildId }, orderBy: { createdAt: "desc" } });
    if (forms.length === 0) {
      await interaction.editReply({ content: "No forms yet — create one with `/form create`." });
      return;
    }
    const lines = forms.map((f) => `\`${f.id}\` — **${f.name}** (${f.status.toLowerCase()})`);
    await interaction.editReply({ content: lines.join("\n") });
    return;
  }

  if (sub === "publish") {
    const formId = interaction.options.getString("form_id", true);
    const form = await prisma.form.findFirst({ where: { id: formId, guildId: interaction.guildId } });
    if (!form) {
      await interaction.editReply({ content: "Form not found." });
      return;
    }
    const fields = formFieldsSchema.parse(form.fields);
    if (fields.length === 0) {
      await interaction.editReply({ content: "This form has no fields yet — add some in the dashboard first." });
      return;
    }
    const issues = validateFormFields(fields);
    if (issues.length > 0) {
      await interaction.editReply({ content: `Can't publish:\n${issues.map((i) => `- ${i.message}`).join("\n")}` });
      return;
    }
    await prisma.form.update({ where: { id: form.id }, data: { status: "PUBLISHED" } });
    await interaction.editReply({ content: `**${form.name}** is published. Use \`/form panel\` to post it.` });
    return;
  }

  if (sub === "panel") {
    const formId = interaction.options.getString("form_id", true);
    const channel = interaction.options.getChannel("channel", true);
    const buttonLabel = interaction.options.getString("button_label") ?? "Submit";

    const form = await prisma.form.findFirst({ where: { id: formId, guildId: interaction.guildId } });
    if (!form) {
      await interaction.editReply({ content: "Form not found." });
      return;
    }
    if (form.status !== "PUBLISHED") {
      await interaction.editReply({ content: "Publish the form first with `/form publish`." });
      return;
    }

    const panel = await prisma.panel.create({
      data: {
        guildId: interaction.guildId,
        name: form.name,
        postChannelId: channel.id,
        buttons: { create: [{ formId: form.id, label: buttonLabel }] },
      },
      include: { buttons: true },
    });
    await postPanelMessage(interaction.client, panel);
    await interaction.editReply({ content: `Panel posted in <#${channel.id}>.` });
    return;
  }
}

export const formCommand: Command = { name: data.name, execute };
export const formCommandData = data;
