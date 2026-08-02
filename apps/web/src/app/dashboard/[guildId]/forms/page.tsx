import Link from "next/link";
import { prisma } from "@/lib/db";
import { createFormAction, deleteFormAction } from "./actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, FileText } from "lucide-react";

export default async function FormsListPage({ params }: { params: { guildId: string } }) {
  const forms = await prisma.form.findMany({
    where: { guildId: params.guildId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Forms</h1>
        <form action={createFormAction} className="flex gap-2">
          <input type="hidden" name="guildId" value={params.guildId} />
          <Input name="name" placeholder="New form name" required className="w-56" />
          <Button type="submit">
            <Plus className="h-4 w-4" />
            New Form
          </Button>
        </form>
      </div>

      {forms.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-16 text-center">
          <FileText className="h-6 w-6 text-muted" />
          <p className="text-sm text-muted">No forms yet — create one above to get started.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {forms.map((form) => (
          <Card key={form.id} className="group relative transition-colors hover:border-primary/40">
            <Link href={`/dashboard/${params.guildId}/forms/${form.id}`} className="block p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="truncate font-semibold">{form.name}</h2>
                <Badge variant={form.status === "PUBLISHED" ? "default" : "secondary"}>
                  {form.status === "PUBLISHED" ? "Published" : "Draft"}
                </Badge>
              </div>
              <p className="text-xs text-muted">Created {form.createdAt.toLocaleDateString()}</p>
            </Link>
            <form action={deleteFormAction} className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
              <input type="hidden" name="guildId" value={params.guildId} />
              <input type="hidden" name="formId" value={form.id} />
              <Button type="submit" variant="ghost" size="icon" className="h-7 w-7 text-muted hover:text-destructive" title="Delete form">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </form>
          </Card>
        ))}
      </div>
    </main>
  );
}
