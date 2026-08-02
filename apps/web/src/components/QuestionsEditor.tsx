"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { FormField } from "@discord-forms/shared";
import { FieldEditor } from "./FieldEditor";
import { DiscordModalPreview } from "./preview/DiscordModalPreview";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

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
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  function handleChange(next: FormField[]) {
    setFields(next);
    setDirty(true);
  }

  async function save() {
    setError(null);
    setSaving(true);
    const res = await fetch(`/api/forms/${formId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    });
    setSaving(false);
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
    <div className="grid grid-cols-1 gap-8 p-8 lg:grid-cols-2">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Questions</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={save} disabled={!dirty || isPending} loading={saving}>
              Save
            </Button>
            {status === "DRAFT" && (
              <Button size="sm" onClick={publish} disabled={isPending}>
                Publish
              </Button>
            )}
          </div>
        </div>
        {error && (
          <div className="mb-3 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
        <FieldEditor fields={fields} onChange={handleChange} />
      </div>

      <div className="lg:sticky lg:top-8 lg:self-start">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">Live preview</h2>
        <DiscordModalPreview title={formName} fields={fields} />
      </div>
    </div>
  );
}
