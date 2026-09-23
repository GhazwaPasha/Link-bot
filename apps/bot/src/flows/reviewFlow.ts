import {
  ActionRowBuilder,
  AttachmentBuilder,
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
import { db, guilds, submissions, type Form, type Submission } from "@discord-forms/db";
import { and, eq } from "drizzle-orm";
import { CustomId, formatAnswerValue, type FormField } from "@discord-forms/shared";
import type { SubmissionSession } from "../state/submissionSession";
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

/** Discord-native submissions can show who submitted; web submissions have no Discord identity to resolve. */
async function resolveSubmitterDescription(client: Client, submission: Submission): Promise<string> {
  if (submission.source === "WEB") return "Submitted via the public web form";
  const name = await resolveDisplayName(client, submission.guildId, submission.userId);
  return `Submitted by ${name}`;
}

function buildSubmissionEmbed(form: Form, fields: FormField[], answers: Record<string, string>, description: string) {
  // Image fields never reach here — they're web-only, and web submissions' messages
  // are built by buildWebSubmissionMessage (posted by the web app or the delivery
  // poller); this filter is just defense-in-depth in case a stray one shows up.
  const textFields = fields.filter((f) => f.type !== "image");
  return new EmbedBuilder()
    .setTitle(form.name)
    .setDescription(description)
    .setColor(0x6366f1)
    .addFields(textFields.map((f) => ({ name: f.label, value: formatAnswerValue(f, answers[f.id]), inline: false })))
    .setTimestamp();
}

/**
 * Re-downloads whatever's attached to the review message itself (Discord's own CDN
 * is the long-term home for images — submission_files only holds them until the
 * review message is posted) so it can
 * ride along to the output channel when a reviewer approves. For Discord-native
 * submissions this is always empty, since image fields can't reach a Discord modal.
 */
async function loadReviewMessageAttachments(interaction: ButtonInteraction): Promise<AttachmentBuilder[]> {
  const attachments = await Promise.all(
    [...interaction.message.attachments.values()].map(async (a) => {
      try {
        const res = await fetch(a.url);
        if (!res.ok) return null;
        const buffer = Buffer.from(await res.arrayBuffer());
        return new AttachmentBuilder(buffer, { name: a.name });
      } catch (err) {
        console.error(`[reviewFlow] failed to re-fetch attachment ${a.url}:`, err);
        return null;
      }
    }),
  );
  return attachments.filter((a): a is AttachmentBuilder => a !== null);
}

function buildReviewButtons(submissionId: string, approveLabel: string, rejectLabel: string) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(CustomId.submissionApprove(submissionId)).setLabel(approveLabel).setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(CustomId.submissionReject(submissionId)).setLabel(rejectLabel).setStyle(ButtonStyle.Danger),
  );
}

/** Shown the instant a reviewer's click is accepted, while the DB write is still in flight. */
function buildPendingButtons(submissionId: string, approving: boolean, approveLabel: string, rejectLabel: string) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(CustomId.submissionApprove(submissionId))
      .setLabel(approving ? "Working…" : approveLabel)
      .setStyle(ButtonStyle.Success)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(CustomId.submissionReject(submissionId))
      .setLabel(!approving ? "Working…" : rejectLabel)
      .setStyle(ButtonStyle.Danger)
      .setDisabled(true),
  );
}

/** Terminal state — a single disabled button recording who decided and how. */
function buildResolvedButtons(submissionId: string, approved: boolean, reviewerName: string, approveLabel: string, rejectLabel: string) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(CustomId.submissionResolved(submissionId))
      .setLabel(`${approved ? approveLabel : rejectLabel} — ${reviewerName}`)
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

async function postOutput(client: Client, form: Form, embed: EmbedBuilder, files: AttachmentBuilder[]) {
  if (!form.outputChannelId) return;
  const channel = await client.channels.fetch(form.outputChannelId).catch(() => null);
  if (channel instanceof TextChannel) {
    await channel.send({ embeds: [embed], files });
  }
}

export async function finalizeSubmission(
  interaction: ButtonInteraction | ModalSubmitInteraction,
  session: SubmissionSession,
  form: Form,
  fields: FormField[],
) {
  const autoApprove = !form.reviewChannelId;

  const [submission] = await db
    .insert(submissions)
    .values({
      formId: form.id,
      guildId: session.guildId,
      userId: session.userId,
      answers: session.answers,
      status: autoApprove ? "APPROVED" : "PENDING",
      source: "DISCORD",
      reviewChannelId: form.reviewChannelId,
      outputChannelId: form.outputChannelId,
      reviewedAt: autoApprove ? new Date() : null,
    })
    .returning();

  const description = await resolveSubmitterDescription(interaction.client, submission);
  const embed = buildSubmissionEmbed(form, fields, submission.answers, description);

  if (autoApprove) {
    await postOutput(interaction.client, form, embed, []);
    await runIntegrations(form, submission);
  } else {
    const channel = await interaction.client.channels.fetch(form.reviewChannelId!).catch(() => null);
    if (channel instanceof TextChannel) {
      const message = await channel.send({
        embeds: [embed],
        components: [buildReviewButtons(submission.id, form.approveButtonLabel, form.rejectButtonLabel)],
      });
      await db.update(submissions).set({ reviewMessageId: message.id }).where(eq(submissions.id, submission.id));
    }
  }

  await respond(interaction, { content: form.confirmationMessage });
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

  const guildRow = await db.query.guilds.findFirst({ where: eq(guilds.guildId, interaction.guildId!) });
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

  const pending = await db.query.submissions.findFirst({ where: eq(submissions.id, submissionId), with: { form: true } });
  const approveLabel = pending?.form.approveButtonLabel ?? "Approve";
  const rejectLabel = pending?.form.rejectButtonLabel ?? "Reject";

  // Flip the buttons into a disabled "in progress" state right away so the
  // message doesn't look clickable again while the DB round-trip below runs.
  await interaction.editReply({ components: [buildPendingButtons(submissionId, approve, approveLabel, rejectLabel)] });

  // Atomically claim the submission — guards against two reviewers racing
  // (e.g. one hits Approve while another hits Reject before either write lands).
  const claim = await db
    .update(submissions)
    .set({
      status: approve ? "APPROVED" : "REJECTED",
      reviewedBy: interaction.user.id,
      reviewedAt: new Date(),
    })
    .where(and(eq(submissions.id, submissionId), eq(submissions.status, "PENDING")))
    .returning({ id: submissions.id });

  const submission = await db.query.submissions.findFirst({
    where: eq(submissions.id, submissionId),
    with: { form: true },
  });
  if (!submission) {
    await interaction.followUp({ content: "Submission not found.", ephemeral: true });
    await interaction.editReply({ components: [] });
    return;
  }

  if (claim.length === 0) {
    // Someone else already resolved it first — surface that instead of clobbering their decision.
    await interaction.followUp({ content: "This submission has already been reviewed.", ephemeral: true });
  }

  const decidedApprove = submission.status === "APPROVED";
  const description = await resolveSubmitterDescription(interaction.client, submission);
  const reviewerName = await resolveDisplayName(interaction.client, submission.guildId, submission.reviewedBy!);

  const fields = submission.form.fields ?? [];
  const embed = buildSubmissionEmbed(submission.form, fields, submission.answers, description).setFooter({
    text: `${decidedApprove ? submission.form.approveButtonLabel : submission.form.rejectButtonLabel} — ${reviewerName}`,
  });

  await interaction.editReply({
    embeds: [embed],
    components: [
      buildResolvedButtons(submissionId, decidedApprove, reviewerName, submission.form.approveButtonLabel, submission.form.rejectButtonLabel),
    ],
  });

  if (claim.length === 1 && decidedApprove) {
    const files = await loadReviewMessageAttachments(interaction);
    await postOutput(interaction.client, submission.form, embed, files);
    await runIntegrations(submission.form, submission);
  }
}

export async function handleSubmissionApprove(interaction: ButtonInteraction, submissionId: string) {
  await resolveReviewDecision(interaction, submissionId, true);
}

export async function handleSubmissionReject(interaction: ButtonInteraction, submissionId: string) {
  await resolveReviewDecision(interaction, submissionId, false);
}
