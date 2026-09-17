"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertCircle, Check, Copy } from "lucide-react";

function CopyableBlock({ value, multiline }: { value: string; multiline?: boolean }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="relative">
      <pre
        className={`overflow-x-auto rounded-md border border-border bg-secondary/40 p-3 pr-10 font-mono text-xs ${multiline ? "whitespace-pre-wrap" : "whitespace-pre"}`}
      >
        {value}
      </pre>
      <Button variant="ghost" size="icon" className="absolute right-1.5 top-1.5 h-7 w-7" onClick={copy}>
        {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}

export function WebFormEditor({
  formId,
  publicUrl,
  embedScriptUrl,
  initialEnabled,
  blockingIssues,
}: {
  formId: string;
  publicUrl: string;
  embedScriptUrl: string;
  initialEnabled: boolean;
  blockingIssues: string[];
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle(next: boolean) {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/forms/${formId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ webFormEnabled: next }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.issues?.[0]?.message ?? body.error ?? "Failed to save.");
      return;
    }
    setEnabled(next);
    router.refresh();
  }

  const embedSnippet = `<iframe src="${publicUrl}" data-discord-forms style="width:100%;border:0;" title="Form"></iframe>\n<script src="${embedScriptUrl}" async></script>`;

  return (
    <main className="max-w-2xl p-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Public web form</h2>
      <p className="mb-4 text-sm text-muted">
        A standalone web page for this form — text fields, image uploads, no Discord account needed. Submissions flow into the same
        review/output channels configured in Settings.
      </p>

      {blockingIssues.length > 0 && (
        <div className="mb-4 flex flex-col gap-1 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <div className="flex items-center gap-2 font-medium">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Can't enable yet
          </div>
          {blockingIssues.map((issue, i) => (
            <p key={i} className="pl-6">
              {issue}
            </p>
          ))}
        </div>
      )}

      <label className="mb-6 flex items-center gap-2 text-sm">
        <Switch checked={enabled} disabled={saving || (blockingIssues.length > 0 && !enabled)} onCheckedChange={toggle} />
        Enable public web form
      </label>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {enabled && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <Label>Public URL</Label>
            <CopyableBlock value={publicUrl} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Embed on another website</Label>
            <p className="text-xs text-muted">
              Drop this into any site's HTML — including a static host like GitHub Pages, no backend required. The iframe auto-resizes
              to fit the form.
            </p>
            <CopyableBlock value={embedSnippet} multiline />
          </div>
        </div>
      )}
    </main>
  );
}
