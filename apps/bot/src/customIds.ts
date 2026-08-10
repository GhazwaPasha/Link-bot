/**
 * All interaction custom_ids are colon-delimited `prefix:arg1:arg2`.
 * Prefixes are kept short — Discord caps custom_id at 100 chars and a
 * session id (uuid) + field id already eats a good chunk of that budget.
 */
export const CustomId = {
  /** arg is a PanelButton id — a panel can have multiple buttons, each pointing at its own form. */
  panelSubmit: (panelButtonId: string) => `psub:${panelButtonId}`,
  sessionSelect: (sessionId: string, fieldId: string) => `ssel:${sessionId}:${fieldId}`,
  sessionContinue: (sessionId: string) => `scon:${sessionId}`,
  sessionModal: (sessionId: string) => `smod:${sessionId}`,
  submissionApprove: (submissionId: string) => `sapp:${submissionId}`,
  submissionReject: (submissionId: string) => `srej:${submissionId}`,
  /** Disabled terminal button showing who approved/rejected — never actually clicked. */
  submissionResolved: (submissionId: string) => `sres:${submissionId}`,
};

export function parseCustomId(customId: string): { prefix: string; args: string[] } {
  const [prefix, ...args] = customId.split(":");
  return { prefix, args };
}
