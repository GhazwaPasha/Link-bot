import { formatAnswerValue } from "./answers";
import { CustomId } from "./customIds";
import type { FormField } from "./fields";

export interface WebSubmissionEmbed {
  title: string;
  description: string;
  color: number;
  fields: { name: string; value: string; inline: boolean }[];
  timestamp: string;
}

export interface WebSubmissionActionRow {
  type: 1;
  components: { type: 2; style: number; label: string; custom_id: string }[];
}

export interface WebSubmissionMessage {
  channelId: string;
  embeds: WebSubmissionEmbed[];
  components?: WebSubmissionActionRow[];
}

/** The subset of a form row this needs — kept structural so this package doesn't depend on @discord-forms/db. */
export interface WebSubmissionForm {
  name: string;
  reviewChannelId: string | null;
  outputChannelId: string | null;
  approveButtonLabel: string;
  rejectButtonLabel: string;
}

/**
 * Raw Discord API payload for a web-form submission's message. Built in one place
 * because two processes post it — the web app on its immediate attempt, and the
 * bot's delivery poller on retries — and the message (especially the review
 * buttons' custom_ids, which route clicks to reviewFlow) must be identical either
 * way. Returns null when there's nowhere to post (auto-approve with no output channel).
 */
export function buildWebSubmissionMessage(
  form: WebSubmissionForm,
  fields: FormField[],
  answers: Record<string, string>,
  submissionId: string,
  submittedAt: Date,
): WebSubmissionMessage | null {
  const embed: WebSubmissionEmbed = {
    title: form.name,
    description: "Submitted via the public web form",
    color: 0x6366f1,
    fields: fields
      .filter((f) => f.type !== "image")
      .map((f) => ({ name: f.label, value: formatAnswerValue(f, answers[f.id]), inline: false })),
    timestamp: submittedAt.toISOString(),
  };

  if (!form.reviewChannelId) {
    if (!form.outputChannelId) return null;
    return { channelId: form.outputChannelId, embeds: [embed] };
  }

  return {
    channelId: form.reviewChannelId,
    embeds: [embed],
    components: [
      {
        type: 1,
        components: [
          { type: 2, style: 3, label: form.approveButtonLabel, custom_id: CustomId.submissionApprove(submissionId) },
          { type: 2, style: 4, label: form.rejectButtonLabel, custom_id: CustomId.submissionReject(submissionId) },
        ],
      },
    ],
  };
}
