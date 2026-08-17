import { randomUUID } from "node:crypto";
import type { Form } from "@discord-forms/db";

/**
 * Holds in-progress submission answers between the select-menu chain and the
 * final modal submit. Single-process, in-memory — fine for one bot instance;
 * would need a shared store (Redis) if the bot ever scales horizontally.
 *
 * `form` is a snapshot taken when the session was created (`handlePanelSubmit`
 * already has it loaded from the panel button lookup) so later steps in the
 * chain — the "Continue" button in particular — don't need their own DB
 * round-trip just to decide how to respond, which would eat into Discord's 3s
 * interaction-ack budget. It can go stale for up to the session TTL if the
 * form is edited/unpublished mid-fill; `handleSessionModalSubmit` re-fetches
 * fresh right after acking, so that path still catches it.
 */
export interface SubmissionSession {
  id: string;
  formId: string;
  panelId: string;
  guildId: string;
  userId: string;
  answers: Record<string, string>;
  createdAt: number;
  form: Form;
}

const sessions = new Map<string, SubmissionSession>();
const SESSION_TTL_MS = 10 * 60 * 1000;

export function createSession(data: Omit<SubmissionSession, "id" | "createdAt">): SubmissionSession {
  const session: SubmissionSession = { ...data, id: randomUUID(), createdAt: Date.now() };
  sessions.set(session.id, session);
  return session;
}

export function getSession(id: string): SubmissionSession | undefined {
  const session = sessions.get(id);
  if (session && Date.now() - session.createdAt > SESSION_TTL_MS) {
    sessions.delete(id);
    return undefined;
  }
  return session;
}

export function updateSessionAnswer(id: string, fieldId: string, value: string) {
  const session = sessions.get(id);
  if (!session) return;
  session.answers[fieldId] = value;
}

export function deleteSession(id: string) {
  sessions.delete(id);
}

setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.createdAt > SESSION_TTL_MS) sessions.delete(id);
  }
}, 60_000).unref();
