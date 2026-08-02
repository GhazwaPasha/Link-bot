"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChannelSelect } from "./ChannelSelect";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2 } from "lucide-react";

interface IntegrationInit {
  webhook?: { url: string; secret: string; enabled: boolean };
  sheets?: { spreadsheetId: string; sheetName: string; serviceAccountJson: string; enabled: boolean };
}

export function SettingsEditor({
  guildId,
  formId,
  initialName,
  initialDescription,
  initialReviewChannelId,
  initialOutputChannelId,
  initialIntegrations,
}: {
  guildId: string;
  formId: string;
  initialName: string;
  initialDescription: string;
  initialReviewChannelId: string | null;
  initialOutputChannelId: string | null;
  initialIntegrations: IntegrationInit;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [reviewChannelId, setReviewChannelId] = useState(initialReviewChannelId);
  const [outputChannelId, setOutputChannelId] = useState(initialOutputChannelId);
  const [savingGeneral, setSavingGeneral] = useState(false);

  const [webhook, setWebhook] = useState(initialIntegrations.webhook ?? { url: "", secret: "", enabled: false });
  const [sheets, setSheets] = useState(
    initialIntegrations.sheets ?? { spreadsheetId: "", sheetName: "Sheet1", serviceAccountJson: "", enabled: false },
  );
  const [savingIntegration, setSavingIntegration] = useState<"WEBHOOK" | "SHEETS" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function saveGeneral() {
    setSavingGeneral(true);
    await fetch(`/api/forms/${formId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, reviewChannelId, outputChannelId }),
    });
    setSavingGeneral(false);
    setMessage("Saved.");
    router.refresh();
  }

  async function saveIntegration(type: "WEBHOOK" | "SHEETS") {
    setSavingIntegration(type);
    const config = type === "WEBHOOK" ? { url: webhook.url, secret: webhook.secret } : sheets;
    const enabled = type === "WEBHOOK" ? webhook.enabled : sheets.enabled;
    await fetch(`/api/forms/${formId}/integrations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, enabled, config }),
    });
    setSavingIntegration(null);
    setMessage("Saved.");
  }

  async function deleteForm() {
    if (!confirm("Delete this form and all its submissions? This can't be undone.")) return;
    await fetch(`/api/forms/${formId}`, { method: "DELETE" });
    router.push(`/dashboard/${guildId}/forms`);
  }

  return (
    <main className="max-w-xl p-8">
      {message && (
        <div className="mb-4 flex items-center gap-1.5 text-sm text-success">
          <CheckCircle2 className="h-4 w-4" />
          {message}
        </div>
      )}

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">General</h2>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Form name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Form name" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Shown on the panel message (optional)"
              rows={2}
            />
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Channels</h2>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Review channel (leave empty to auto-approve)</Label>
            <ChannelSelect guildId={guildId} value={reviewChannelId} onChange={setReviewChannelId} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Output channel</Label>
            <ChannelSelect guildId={guildId} value={outputChannelId} onChange={setOutputChannelId} />
          </div>
        </div>
      </section>

      <Button className="mb-10" onClick={saveGeneral} disabled={savingGeneral} loading={savingGeneral}>
        Save settings
      </Button>

      <Separator className="mb-8" />

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Webhook integration</h2>
        <div className="flex flex-col gap-3">
          <Input
            value={webhook.url}
            onChange={(e) => setWebhook({ ...webhook, url: e.target.value })}
            placeholder="https://example.com/webhook"
          />
          <Input
            value={webhook.secret}
            onChange={(e) => setWebhook({ ...webhook, secret: e.target.value })}
            placeholder="Signing secret (optional)"
            type="password"
          />
          <label className="flex items-center gap-2 text-sm text-muted">
            <Switch checked={webhook.enabled} onCheckedChange={(c) => setWebhook({ ...webhook, enabled: c })} />
            Enabled
          </label>
          <Button
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => saveIntegration("WEBHOOK")}
            disabled={savingIntegration === "WEBHOOK"}
            loading={savingIntegration === "WEBHOOK"}
          >
            Save webhook
          </Button>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Google Sheets integration</h2>
        <div className="flex flex-col gap-3">
          <Input
            value={sheets.spreadsheetId}
            onChange={(e) => setSheets({ ...sheets, spreadsheetId: e.target.value })}
            placeholder="Spreadsheet ID"
          />
          <Input
            value={sheets.sheetName}
            onChange={(e) => setSheets({ ...sheets, sheetName: e.target.value })}
            placeholder="Sheet name (default: Sheet1)"
          />
          <Textarea
            value={sheets.serviceAccountJson}
            onChange={(e) => setSheets({ ...sheets, serviceAccountJson: e.target.value })}
            placeholder="Service account JSON key"
            rows={3}
            className="font-mono text-xs"
          />
          <label className="flex items-center gap-2 text-sm text-muted">
            <Switch checked={sheets.enabled} onCheckedChange={(c) => setSheets({ ...sheets, enabled: c })} />
            Enabled
          </label>
          <Button
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => saveIntegration("SHEETS")}
            disabled={savingIntegration === "SHEETS"}
            loading={savingIntegration === "SHEETS"}
          >
            Save Sheets
          </Button>
        </div>
      </section>

      <Separator className="mb-6" />

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-destructive">Danger zone</h2>
        <Button variant="destructive" onClick={deleteForm}>
          Delete form
        </Button>
      </section>
    </main>
  );
}
