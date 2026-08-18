import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ModalBuilder,
  RoleSelectMenuBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
  UserSelectMenuBuilder,
  type AnySelectMenuInteraction,
  type ButtonInteraction,
  type ModalSubmitInteraction,
} from "discord.js";
import { db, forms } from "@discord-forms/db";
import { eq } from "drizzle-orm";
import {
  formFieldsSchema,
  splitFieldsForFlow,
  type FormField,
} from "@discord-forms/shared";
import { CustomId, parseCustomId } from "../customIds";
import { createSession, deleteSession, getSession, updateSessionAnswer } from "../state/submissionSession";
import { getPanelButtonCached } from "../state/panelButtonCache";
import { finalizeSubmission } from "./reviewFlow";

function buildSelectRow(sessionId: string, field: FormField) {
  const customId = CustomId.sessionSelect(sessionId, field.id);

  if (field.type === "user_select") {
    return new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
      new UserSelectMenuBuilder().setCustomId(customId).setPlaceholder(field.label).setMinValues(field.required ? 1 : 0).setMaxValues(1),
    );
  }
  if (field.type === "role_select") {
    return new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
      new RoleSelectMenuBuilder().setCustomId(customId).setPlaceholder(field.label).setMinValues(field.required ? 1 : 0).setMaxValues(1),
    );
  }
  if (field.type === "channel_select") {
    return new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
      new ChannelSelectMenuBuilder().setCustomId(customId).setPlaceholder(field.label).setMinValues(field.required ? 1 : 0).setMaxValues(1),
    );
  }

  // dropdown / checkbox
  const isCheckbox = field.type === "checkbox";
  const options = (field.options ?? []).map((o) => ({
    label: o.label,
    value: o.value,
    description: o.description,
  }));
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder(field.label)
      .setMinValues(field.required && !isCheckbox ? 1 : 0)
      .setMaxValues(isCheckbox ? Math.max(1, options.length) : 1)
      .addOptions(options),
  );
}

function buildContinueRow(sessionId: string) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(CustomId.sessionContinue(sessionId)).setLabel("Continue").setStyle(ButtonStyle.Success),
  );
}

function buildModal(sessionId: string, textFields: FormField[]) {
  const modal = new ModalBuilder().setCustomId(CustomId.sessionModal(sessionId)).setTitle("Submit form");
  for (const field of textFields) {
    const input = new TextInputBuilder()
      .setCustomId(field.id)
      .setLabel(field.label)
      .setStyle(field.type === "paragraph" ? TextInputStyle.Paragraph : TextInputStyle.Short)
      .setRequired(field.required);
    if (field.placeholder) input.setPlaceholder(field.placeholder);
    if (field.minLength !== undefined) input.setMinLength(field.minLength);
    if (field.maxLength !== undefined) input.setMaxLength(field.maxLength);
    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
  }
  return modal;
}

export async function handlePanelSubmit(interaction: ButtonInteraction, panelButtonId: string) {
  // Cached — this is the very first interaction in the flow (no ack yet, and
  // showModal below must be the *initial* response), so a cold DB round-trip
  // here (1-3s, see panelButtonCache) risks blowing Discord's 3s ack deadline.
  const panelButton = await getPanelButtonCached(panelButtonId);
  if (!panelButton || panelButton.form.status !== "PUBLISHED") {
    await interaction.reply({ content: "This form is no longer available.", ephemeral: true });
    return;
  }

  const fields = formFieldsSchema.parse(panelButton.form.fields);
  const { selectFields, textFields } = splitFieldsForFlow(fields);

  const session = createSession({
    formId: panelButton.form.id,
    panelId: panelButton.panel.id,
    guildId: panelButton.panel.guildId,
    userId: interaction.user.id,
    answers: {},
    form: panelButton.form,
  });

  if (selectFields.length === 0) {
    await interaction.showModal(buildModal(session.id, textFields));
    return;
  }

  const rows = [...selectFields.map((f) => buildSelectRow(session.id, f)), buildContinueRow(session.id)];
  await interaction.reply({
    content: "Fill in the options below, then hit **Continue**.",
    components: rows,
    ephemeral: true,
  });
}

export async function handleSessionSelect(interaction: AnySelectMenuInteraction, sessionId: string, fieldId: string) {
  const session = getSession(sessionId);
  if (!session) {
    await interaction.reply({ content: "This form session expired — please click the button again.", ephemeral: true });
    return;
  }

  const value = interaction.values.join(",");
  updateSessionAnswer(sessionId, fieldId, value);
  await interaction.deferUpdate();
}

export async function handleSessionContinue(interaction: ButtonInteraction, sessionId: string) {
  const session = getSession(sessionId);
  if (!session) {
    await interaction.reply({ content: "This form session expired — please click the button again.", ephemeral: true });
    return;
  }

  // Snapshot taken when the session was created — no DB round-trip here,
  // since showModal below must be the *initial* (undeferred) response and a
  // cold query (1-3s) risks blowing Discord's 3s ack deadline. See
  // SubmissionSession.form for the staleness tradeoff.
  const form = session.form;
  if (form.status !== "PUBLISHED") {
    await interaction.reply({ content: "This form is no longer available.", ephemeral: true });
    deleteSession(sessionId);
    return;
  }

  const fields = formFieldsSchema.parse(form.fields);
  const { selectFields, textFields } = splitFieldsForFlow(fields);

  const missing = selectFields.filter((f) => f.required && !session.answers[f.id]);
  if (missing.length > 0) {
    await interaction.reply({
      content: `Please fill in: ${missing.map((f) => f.label).join(", ")}`,
      ephemeral: true,
    });
    return;
  }

  if (textFields.length > 0) {
    await interaction.showModal(buildModal(sessionId, textFields));
    return;
  }

  await interaction.update({ content: "Submitting…", components: [] });
  await finalizeSubmission(interaction, session, form, fields);
  deleteSession(sessionId);
}

export async function handleSessionModalSubmit(interaction: ModalSubmitInteraction, sessionId: string) {
  // Ack immediately — finalizeSubmission does a DB write plus (on the review
  // path) a channel fetch/send, which can blow past Discord's 3s deadline
  // (code 10062 "Unknown interaction") if we wait until the end to respond.
  await interaction.deferReply({ ephemeral: true });

  const session = getSession(sessionId);
  if (!session) {
    await interaction.editReply({ content: "This form session expired — please click the button again." });
    return;
  }

  const form = await db.query.forms.findFirst({ where: eq(forms.id, session.formId) });
  if (!form || form.status !== "PUBLISHED") {
    await interaction.editReply({ content: "This form is no longer available." });
    deleteSession(sessionId);
    return;
  }

  const fields = formFieldsSchema.parse(form.fields);
  const { textFields } = splitFieldsForFlow(fields);
  for (const field of textFields) {
    const value = interaction.fields.getTextInputValue(field.id);
    session.answers[field.id] = value;
  }

  await finalizeSubmission(interaction, session, form, fields);
  deleteSession(sessionId);
}
