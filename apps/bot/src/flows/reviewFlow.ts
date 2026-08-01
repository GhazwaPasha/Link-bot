import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
  TextChannel,
  type AnySelectMenuInteraction,
  type ButtonInteraction,
  type ModalSubmitInteraction,
} from "discord.js";
import { prisma, type Form } from "@discord-forms/db";
import { formatAnswerValue, type FormField } from "@discord-forms/shared";
import type { SubmissionSession } from "../state/submissionSession";
import { CustomId } from "../customIds";
import { runIntegrations } from "../integrations";

function buildSubmissionEmbed(form: Form, fields: FormField[], answers: Record<string, string>, userId: string) {
  return new EmbedBuilder()
    .setTitle(form.name)
    .setDescription(`Submitted by <@${userId}>`)
    .setColor(0x6366f1)
    .addFields(fields.map((f) => ({ name: f.label, value: formatAnswerValue(f, answers[f.id]), inline: false })))
    .setTimestamp();
}

function buildReviewButtons(submissionId: string) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(CustomId.submissionApprove(submissionId)).setLabel("Approve").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(CustomId.submissionReject(submissionId)).setLabel("Reject").setStyle(ButtonStyle.Danger),
  );
}

async function respond(
  interaction: ButtonInteraction | ModalSubmitInteraction | AnySelectMenuInteraction,
  payload: { content: string },
) {
  if (interaction.replied || interaction.deferred) {
    await interaction.followUp({ ...payload, ephemeral: true });
  } else {
    await interaction.reply({ ...payload, ephemeral: true });
  }
}

async function postOutput(interaction: ButtonInteraction | ModalSubmitInteraction, form: Form, embed: EmbedBuilder) {
  if (!form.outputChannelId) return;
  const channel = await interaction.client.channels.fetch(form.outputChannelId).catch(() => null);
  if (channel instanceof TextChannel) {
    await channel.send({ embeds: [embed] });
  }
}

export async function finalizeSubmission(
  interaction: ButtonInteraction | ModalSubmitInteraction,
  session: SubmissionSession,
  form: Form,
  fields: FormField[],
) {
  const autoApprove = !form.reviewChannelId;

  const submission = await prisma.submission.create({
    data: {
      formId: form.id,
      guildId: session.guildId,
      userId: session.userId,
      answers: session.answers,
      status: autoApprove ? "APPROVED" : "PENDING",
      reviewChannelId: form.reviewChannelId,
      outputChannelId: form.outputChannelId,
      reviewedAt: autoApprove ? new Date() : null,
    },
  });

  const embed = buildSubmissionEmbed(form, fields, session.answers, session.userId);

  if (autoApprove) {
    await postOutput(interaction, form, embed);
    await runIntegrations(form, submission);
  } else {
    const channel = await interaction.client.channels.fetch(form.reviewChannelId!).catch(() => null);
    if (channel instanceof TextChannel) {
      const message = await channel.send({ embeds: [embed], components: [buildReviewButtons(submission.id)] });
      await prisma.submission.update({ where: { id: submission.id }, data: { reviewMessageId: message.id } });
    }
  }

  await respond(interaction, { content: "Thanks — your submission has been recorded!" });
}

async function canReview(interaction: ButtonInteraction): Promise<boolean> {
  if (!interaction.inCachedGuild()) return false;
  if (interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) return true;

  const guildRow = await prisma.guild.findUnique({ where: { guildId: interaction.guildId! } });
  if (!guildRow || guildRow.reviewRoleIds.length === 0) return false;
  return interaction.member.roles.cache.some((r) => guildRow.reviewRoleIds.includes(r.id));
}

async function resolveReviewDecision(interaction: ButtonInteraction, submissionId: string, approve: boolean) {
  const allowed = await canReview(interaction);
  if (!allowed) {
    await interaction.reply({ content: "You don't have permission to review submissions.", ephemeral: true });
    return;
  }

  const submission = await prisma.submission.findUnique({ where: { id: submissionId }, include: { form: true } });
  if (!submission) {
    await interaction.reply({ content: "Submission not found.", ephemeral: true });
    return;
  }
  if (submission.status !== "PENDING") {
    await interaction.reply({ content: "This submission has already been reviewed.", ephemeral: true });
    return;
  }

  const updated = await prisma.submission.update({
    where: { id: submissionId },
    data: {
      status: approve ? "APPROVED" : "REJECTED",
      reviewedBy: interaction.user.id,
      reviewedAt: new Date(),
    },
  });

  const fields = (submission.form.fields ?? []) as unknown as FormField[];
  const embed = buildSubmissionEmbed(submission.form, fields, submission.answers as Record<string, string>, submission.userId).setFooter({
    text: `${approve ? "Approved" : "Rejected"} by ${interaction.user.tag}`,
  });

  await interaction.update({ embeds: [embed], components: [] });

  if (approve) {
    await postOutput(interaction, submission.form, embed);
    await runIntegrations(submission.form, updated);
  }
}

export async function handleSubmissionApprove(interaction: ButtonInteraction, submissionId: string) {
  await resolveReviewDecision(interaction, submissionId, true);
}

export async function handleSubmissionReject(interaction: ButtonInteraction, submissionId: string) {
  await resolveReviewDecision(interaction, submissionId, false);
}
