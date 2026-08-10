import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
  TextChannel,
  type AnySelectMenuInteraction,
  type ButtonInteraction,
  type Client,
  type ModalSubmitInteraction,
} from "discord.js";
import { prisma, type Form } from "@discord-forms/db";
import { formatAnswerValue, type FormField } from "@discord-forms/shared";
import type { SubmissionSession } from "../state/submissionSession";
import { CustomId } from "../customIds";
import { runIntegrations } from "../integrations";

/**
 * Resolves a person's display name — server nickname if they have one, else
 * their global display name, else their username — never a raw snowflake ID.
 * Falls back gracefully if they've left the server or the fetch otherwise fails.
 */
async function resolveDisplayName(client: Client, guildId: string, userId: string): Promise<string> {
  try {
    const guild = await client.guilds.fetch(guildId);
    const member = await guild.members.fetch(userId);
    return member.displayName;
  } catch {
    const user = await client.users.fetch(userId).catch(() => null);
    return user?.globalName ?? user?.username ?? "Unknown user";
  }
}

function buildSubmissionEmbed(form: Form, fields: FormField[], answers: Record<string, string>, submitterName: string) {
  return new EmbedBuilder()
    .setTitle(form.name)
    .setDescription(`Submitted by ${submitterName}`)
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

/** Shown the instant a reviewer's click is accepted, while the DB write is still in flight. */
function buildPendingButtons(submissionId: string, approving: boolean) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(CustomId.submissionApprove(submissionId))
      .setLabel(approving ? "Approving…" : "Approve")
      .setStyle(ButtonStyle.Success)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(CustomId.submissionReject(submissionId))
      .setLabel(approving ? "Reject" : "Rejecting…")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(true),
  );
}

/** Terminal state — a single disabled button recording who decided and how. */
function buildResolvedButtons(submissionId: string, approved: boolean, reviewerName: string) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(CustomId.submissionResolved(submissionId))
      .setLabel(approved ? `Approved by ${reviewerName}` : `Rejected by ${reviewerName}`)
      .setStyle(approved ? ButtonStyle.Success : ButtonStyle.Danger)
      .setDisabled(true),
  );
}

async function respond(
  interaction: ButtonInteraction | ModalSubmitInteraction | AnySelectMenuInteraction,
  payload: { content: string },
) {
  if (interaction.deferred && !interaction.replied) {
    await interaction.editReply(payload);
  } else if (interaction.replied) {
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

  const submitterName = await resolveDisplayName(interaction.client, session.guildId, session.userId);
  const embed = buildSubmissionEmbed(form, fields, session.answers, submitterName);

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

  // Anyone who can see the review channel itself (e.g. it's restricted to a
  // private set of roles/members via channel overwrites) counts as a reviewer.
  // interaction.memberPermissions is computed in the channel the interaction
  // fired in — unlike interaction.member.permissions, which is guild-wide and
  // ignores channel overwrites.
  if (interaction.memberPermissions?.has(PermissionFlagsBits.ViewChannel)) return true;

  const guildRow = await prisma.guild.findUnique({ where: { guildId: interaction.guildId! } });
  if (!guildRow || guildRow.reviewRoleIds.length === 0) return false;
  return interaction.member.roles.cache.some((r) => guildRow.reviewRoleIds.includes(r.id));
}

async function resolveReviewDecision(interaction: ButtonInteraction, submissionId: string, approve: boolean) {
  // Ack immediately — the permission check and the DB round-trips below can
  // easily blow past Discord's 3s interaction deadline (code 10062) otherwise.
  await interaction.deferUpdate();

  const allowed = await canReview(interaction);
  if (!allowed) {
    await interaction.followUp({ content: "You don't have permission to review submissions.", ephemeral: true });
    return;
  }

  // Flip the buttons into a disabled "in progress" state right away so the
  // message doesn't look clickable again while the DB round-trip below runs.
  await interaction.editReply({ components: [buildPendingButtons(submissionId, approve)] });

  // Atomically claim the submission — guards against two reviewers racing
  // (e.g. one hits Approve while another hits Reject before either write lands).
  const claim = await prisma.submission.updateMany({
    where: { id: submissionId, status: "PENDING" },
    data: {
      status: approve ? "APPROVED" : "REJECTED",
      reviewedBy: interaction.user.id,
      reviewedAt: new Date(),
    },
  });

  const submission = await prisma.submission.findUnique({ where: { id: submissionId }, include: { form: true } });
  if (!submission) {
    await interaction.followUp({ content: "Submission not found.", ephemeral: true });
    await interaction.editReply({ components: [] });
    return;
  }

  if (claim.count === 0) {
    // Someone else already resolved it first — surface that instead of clobbering their decision.
    await interaction.followUp({ content: "This submission has already been reviewed.", ephemeral: true });
  }

  const decidedApprove = submission.status === "APPROVED";
  const [submitterName, reviewerName] = await Promise.all([
    resolveDisplayName(interaction.client, submission.guildId, submission.userId),
    resolveDisplayName(interaction.client, submission.guildId, submission.reviewedBy!),
  ]);

  const fields = (submission.form.fields ?? []) as unknown as FormField[];
  const embed = buildSubmissionEmbed(submission.form, fields, submission.answers as Record<string, string>, submitterName).setFooter({
    text: `${decidedApprove ? "Approved" : "Rejected"} by ${reviewerName}`,
  });

  await interaction.editReply({ embeds: [embed], components: [buildResolvedButtons(submissionId, decidedApprove, reviewerName)] });

  if (claim.count === 1 && decidedApprove) {
    await postOutput(interaction, submission.form, embed);
    await runIntegrations(submission.form, submission);
  }
}

export async function handleSubmissionApprove(interaction: ButtonInteraction, submissionId: string) {
  await resolveReviewDecision(interaction, submissionId, true);
}

export async function handleSubmissionReject(interaction: ButtonInteraction, submissionId: string) {
  await resolveReviewDecision(interaction, submissionId, false);
}
