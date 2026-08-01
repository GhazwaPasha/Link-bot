import { prisma } from "@/lib/db";
import { formatAnswerValue, formFieldsSchema } from "@discord-forms/shared";

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-white/10 text-muted",
  APPROVED: "bg-emerald-500/15 text-emerald-400",
  REJECTED: "bg-red-500/15 text-red-400",
};

export default async function GuildSubmissionsPage({ params }: { params: { guildId: string } }) {
  const submissions = await prisma.submission.findMany({
    where: { guildId: params.guildId },
    include: { form: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <main className="p-8">
      <h1 className="mb-6 text-2xl font-bold">Submissions</h1>

      {submissions.length === 0 && <p className="text-muted">No submissions yet.</p>}

      <div className="flex flex-col gap-3">
        {submissions.map((s) => {
          const fields = formFieldsSchema.parse(s.form.fields);
          const answers = s.answers as Record<string, string>;
          return (
            <div key={s.id} className="rounded border border-border bg-card p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">
                  {s.form.name} <span className="text-muted">— by {s.userId}</span>
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted">{s.createdAt.toLocaleString()}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[s.status]}`}>{s.status}</span>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {fields.map((f) => (
                  <div key={f.id} className="contents">
                    <dt className="text-muted">{f.label}</dt>
                    <dd>{formatAnswerValue(f, answers[f.id])}</dd>
                  </div>
                ))}
              </dl>
            </div>
          );
        })}
      </div>
    </main>
  );
}
