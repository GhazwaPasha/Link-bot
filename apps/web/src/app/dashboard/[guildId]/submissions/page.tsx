import { prisma } from "@/lib/db";
import { formatAnswerValue, formFieldsSchema } from "@discord-forms/shared";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Inbox } from "lucide-react";

const STATUS_VARIANT = {
  PENDING: "secondary",
  APPROVED: "success",
  REJECTED: "destructive",
} as const;

export default async function GuildSubmissionsPage({ params }: { params: { guildId: string } }) {
  const submissions = await prisma.submission.findMany({
    where: { guildId: params.guildId },
    include: { form: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <main className="p-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Submissions</h1>

      {submissions.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-16 text-center">
          <Inbox className="h-6 w-6 text-muted" />
          <p className="text-sm text-muted">No submissions yet.</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {submissions.map((s) => {
          const fields = formFieldsSchema.parse(s.form.fields);
          const answers = s.answers as Record<string, string>;
          return (
            <Card key={s.id} className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">
                  {s.form.name} <span className="text-muted">— by {s.userId}</span>
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted">{s.createdAt.toLocaleString()}</span>
                  <Badge variant={STATUS_VARIANT[s.status]}>{s.status}</Badge>
                </div>
              </div>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
                {fields.map((f) => (
                  <div key={f.id} className="contents">
                    <dt className="text-muted">{f.label}</dt>
                    <dd>{formatAnswerValue(f, answers[f.id])}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
