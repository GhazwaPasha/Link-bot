"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { FormField } from "@discord-forms/shared";
import { FieldEditor } from "./FieldEditor";
import { DiscordModalPreview } from "./preview/DiscordModalPreview";

export function QuestionsEditor({
  formId,
  formName,
  initialFields,
  status,
}: {
  formId: string;
  formName: string;
  initialFields: FormField[];
  status: "DRAFT" | "PUBLISHED";
}) {
  const [fields, setFields] = useState<FormField[]>(initialFields);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleChange(next: FormField[]) {
    setFields(next);
    setDirty(true);
  }

  async function save() {
    setError(null);
    const res = await fetch(`/api/forms/${formId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to save.");
      return;
    }
    setDirty(false);
    startTransition(() => router.refresh());
  }

  async function publish() {
    if (dirty) await save();
    setError(null);
    const res = await fetch(`/api/forms/${formId}/publish`, { method: "POST" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to publish.");
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="grid grid-cols-2 gap-8 p-8">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Questions</h2>
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={!dirty || isPending}
              className="rounded border border-border px-3 py-1.5 text-sm font-medium hover:border-accent disabled:opacity-40"
            >
              Save
            </button>
            {status === "DRAFT" && (
              <button
                onClick={publish}
                disabled={isPending}
                className="rounded bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-40"
              >
                Publish
              </button>
            )}
          </div>
        </div>
        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
        <FieldEditor fields={fields} onChange={handleChange} />
      </div>

      <div className="sticky top-8 self-start">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">Live preview</h2>
        <DiscordModalPreview title={formName} fields={fields} />
      </div>
    </div>
  );
}
