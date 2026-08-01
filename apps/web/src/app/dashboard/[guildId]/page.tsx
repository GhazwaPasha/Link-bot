import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function OverviewPage({ params }: { params: { guildId: string } }) {
  const [formCount, publishedCount, pendingCount] = await Promise.all([
    prisma.form.count({ where: { guildId: params.guildId } }),
    prisma.form.count({ where: { guildId: params.guildId, status: "PUBLISHED" } }),
    prisma.submission.count({ where: { guildId: params.guildId, status: "PENDING" } }),
  ]);

  const stats = [
    { label: "Forms", value: formCount, href: `/dashboard/${params.guildId}/forms` },
    { label: "Published", value: publishedCount, href: `/dashboard/${params.guildId}/forms` },
    { label: "Pending review", value: pendingCount, href: `/dashboard/${params.guildId}/submissions` },
  ];

  return (
    <main className="p-8">
      <h1 className="mb-6 text-2xl font-bold">Overview</h1>
      <div className="grid grid-cols-3 gap-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="rounded border border-border bg-card p-5 transition hover:border-accent"
          >
            <div className="text-3xl font-bold">{s.value}</div>
            <div className="text-sm text-muted">{s.label}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}
