import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { submissions } from "@discord-forms/db";
import { and, eq } from "drizzle-orm";
import { checkGuildAccess } from "@/lib/apiAuth";

/**
 * Puts a web submission whose Discord delivery FAILED back in the outbox, so the
 * bot's delivery poller (apps/bot/src/deliveryPoller.ts) attempts it again on its
 * next tick. Same idea as the panel retry route — the poller stops on a permanent
 * error (deleted channel, missing access) and this is how a person asks for
 * another attempt after fixing it.
 */
export async function POST(req: NextRequest, { params }: { params: { guildId: string; submissionId: string } }) {
  const access = await checkGuildAccess(params.guildId);
  if (!access.ok) return NextResponse.json({ error: "Forbidden" }, { status: access.status });

  const submission = await db.query.submissions.findFirst({ where: eq(submissions.id, params.submissionId) });
  if (!submission || submission.guildId !== params.guildId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (submission.deliveryStatus !== "FAILED") {
    return NextResponse.json({ error: "Submission hasn't failed delivery, nothing to retry" }, { status: 400 });
  }

  const [updated] = await db
    .update(submissions)
    .set({ deliveryStatus: "PENDING", deliveryAttempts: 0, deliveryLastError: null, deliveryNextAttemptAt: new Date() })
    .where(and(eq(submissions.id, submission.id), eq(submissions.deliveryStatus, "FAILED")))
    .returning({ id: submissions.id, deliveryStatus: submissions.deliveryStatus });

  return NextResponse.json(updated);
}
