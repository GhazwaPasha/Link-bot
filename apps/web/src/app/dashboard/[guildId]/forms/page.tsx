import Link from "next/link";
import { prisma } from "@/lib/db";
import { createFormAction, deleteFormAction } from "./actions";

export default async function FormsListPage({ params }: { params: { guildId: string } }) {
  const forms = await prisma.form.findMany({
    where: { guildId: params.guildId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Forms</h1>
        <form action={createFormAction} className="flex gap-2">
          <input type="hidden" name="guildId" value={params.guildId} />
          <input
            name="name"
            placeholder="New form name"
            required
            className="discord-modal-input rounded px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button className="rounded bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover">
            New Form
          </button>
        </form>
      </div>

      {forms.length === 0 && <p className="text-muted">No forms yet — create one above.</p>}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {forms.map((form) => (
          <div key={form.id} className="group relative rounded border border-border bg-card p-4">
            <Link href={`/dashboard/${params.guildId}/forms/${form.id}`} className="block">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-semibold">{form.name}</h2>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    form.status === "PUBLISHED" ? "bg-accent-muted text-accent" : "bg-white/10 text-muted"
                  }`}
                >
                  {form.status === "PUBLISHED" ? "Published" : "Draft"}
                </span>
              </div>
              <p className="text-xs text-muted">Created {form.createdAt.toLocaleDateString()}</p>
            </Link>
            <form action={deleteFormAction} className="absolute right-3 top-3 opacity-0 group-hover:opacity-100">
              <input type="hidden" name="guildId" value={params.guildId} />
              <input type="hidden" name="formId" value={form.id} />
              <button
                type="submit"
                title="Delete form"
                className="rounded px-2 py-1 text-xs text-muted hover:bg-white/10 hover:text-red-400"
              >
                Delete
              </button>
            </form>
          </div>
        ))}
      </div>
    </main>
  );
}
