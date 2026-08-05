import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function OverviewPage({ params }: { params: { guildId: string } }) {
  const [formCount, publishedCount] = await Promise.all([
    prisma.form.count({ where: { guildId: params.guildId } }),
    prisma.form.count({ where: { guildId: params.guildId, status: "PUBLISHED" } }),
  ]);

  const stats = [
    { label: "Forms", value: formCount, href: `/dashboard/${params.guildId}/forms`, icon: FileText },
    { label: "Published", value: publishedCount, href: `/dashboard/${params.guildId}/forms`, icon: CheckCircle2 },
  ];

  return (
    <main className="p-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Overview</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="transition-colors hover:border-primary/40">
              <CardContent className="flex items-start justify-between p-5">
                <div>
                  <div className="text-3xl font-bold">{s.value}</div>
                  <div className="text-sm text-muted">{s.label}</div>
                </div>
                <s.icon className={cn("h-5 w-5 text-muted")} />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
