/**
 * All interaction custom_ids are colon-delimited `prefix:arg1:arg2`.
 * Prefixes are kept short — Discord caps custom_id at 100 chars and a
 * session id (uuid) + field id already eats a good chunk of that budget.
 */
export const CustomId = {
  panelSubmit: (panelId: string) => `psub:${panelId}`,
  sessionSelect: (sessionId: string, fieldId: string) => `ssel:${sessionId}:${fieldId}`,
  sessionContinue: (sessionId: string) => `scon:${sessionId}`,
  sessionModal: (sessionId: string) => `smod:${sessionId}`,
  submissionApprove: (submissionId: string) => `sapp:${submissionId}`,
  submissionReject: (submissionId: string) => `srej:${submissionId}`,
};

export function parseCustomId(customId: string): { prefix: string; args: string[] } {
  const [prefix, ...args] = customId.split(":");
  return { prefix, args };
}
