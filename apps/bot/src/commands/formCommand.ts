import {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { db, forms, guilds, panelButtons, panels } from "@discord-forms/db";
import { and, desc, eq, sql } from "drizzle-orm";
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
  // undefined (not null) for name/iconUrl on the update branch — matches Prisma's `?? undefined`
  // behavior of leaving the existing value alone rather than overwriting it with NULL.
  await db
    .insert(guilds)
    .values({ guildId, name: guildName ?? undefined, iconUrl: iconUrl ?? undefined })
    .onConflictDoUpdate({
      target: guilds.guildId,
      set: { name: guildName ?? undefined, iconUrl: iconUrl ?? undefined, updatedAt: sql`now()` },
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
    const [form] = await db.insert(forms).values({ guildId: interaction.guildId, name, fields: [] }).returning();
    await interaction.editReply({
      content: `Created draft form **${name}** (ID \`${form.id}\`). Finish building it at ${env.DASHBOARD_URL}/dashboard/${interaction.guildId}/forms/${form.id}, then run \`/form publish\`.`,
    });
    return;
  }

  if (sub === "list") {
    const formRows = await db.query.forms.findMany({
      where: eq(forms.guildId, interaction.guildId),
      orderBy: desc(forms.createdAt),
    });
    if (formRows.length === 0) {
      await interaction.editReply({ content: "No forms yet — create one with `/form create`." });
      return;
    }
    const lines = formRows.map((f) => `\`${f.id}\` — **${f.name}** (${f.status.toLowerCase()})`);
    await interaction.editReply({ content: lines.join("\n") });
    return;
  }

  if (sub === "publish") {
    const formId = interaction.options.getString("form_id", true);
    const form = await db.query.forms.findFirst({
      where: and(eq(forms.id, formId), eq(forms.guildId, interaction.guildId)),
    });
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
    await db.update(forms).set({ status: "PUBLISHED" }).where(eq(forms.id, form.id));
    await interaction.editReply({ content: `**${form.name}** is published. Use \`/form panel\` to post it.` });
    return;
  }

  if (sub === "panel") {
    const formId = interaction.options.getString("form_id", true);
    const channel = interaction.options.getChannel("channel", true);
    const buttonLabel = interaction.options.getString("button_label") ?? "Submit";

    const form = await db.query.forms.findFirst({
      where: and(eq(forms.id, formId), eq(forms.guildId, interaction.guildId)),
    });
    if (!form) {
      await interaction.editReply({ content: "Form not found." });
      return;
    }
    if (form.status !== "PUBLISHED") {
      await interaction.editReply({ content: "Publish the form first with `/form publish`." });
      return;
    }

    const panel = await db.transaction(async (tx) => {
      const [panelRow] = await tx
        .insert(panels)
        .values({ guildId: interaction.guildId, name: form.name, postChannelId: channel.id })
        .returning();
      const buttonRows = await tx
        .insert(panelButtons)
        .values({ panelId: panelRow.id, formId: form.id, label: buttonLabel })
        .returning();
      return { ...panelRow, buttons: buttonRows };
    });
    await postPanelMessage(interaction.client, panel);
    await interaction.editReply({ content: `Panel posted in <#${channel.id}>.` });
    return;
  }
}

export const formCommand: Command = { name: data.name, execute };
export const formCommandData = data;
