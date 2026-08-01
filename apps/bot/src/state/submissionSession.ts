import { randomUUID } from "node:crypto";

/**
 * Holds in-progress submission answers between the select-menu chain and the
 * final modal submit. Single-process, in-memory — fine for one bot instance;
 * would need a shared store (Redis) if the bot ever scales horizontally.
 */
export interface SubmissionSession {
  id: string;
  formId: string;
  panelId: string;
  guildId: string;
  userId: string;
  answers: Record<string, string>;
  createdAt: number;
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
