"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChannelSelect } from "./ChannelSelect";

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
      {message && <p className="mb-4 text-sm text-accent">{message}</p>}

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">General</h2>
        <div className="flex flex-col gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Form name"
            className="discord-modal-input rounded px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description shown on the panel message (optional)"
            rows={2}
            className="discord-modal-input rounded px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Channels</h2>
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs text-muted">Review channel (leave empty to auto-approve)</label>
            <ChannelSelect guildId={guildId} value={reviewChannelId} onChange={setReviewChannelId} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Output channel</label>
            <ChannelSelect guildId={guildId} value={outputChannelId} onChange={setOutputChannelId} />
          </div>
        </div>
      </section>

      <button
        onClick={saveGeneral}
        disabled={savingGeneral}
        className="mb-10 rounded bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-40"
      >
        Save settings
      </button>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Webhook integration</h2>
        <div className="flex flex-col gap-3">
          <input
            value={webhook.url}
            onChange={(e) => setWebhook({ ...webhook, url: e.target.value })}
            placeholder="https://example.com/webhook"
            className="discord-modal-input rounded px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <input
            value={webhook.secret}
            onChange={(e) => setWebhook({ ...webhook, secret: e.target.value })}
            placeholder="Signing secret (optional)"
            type="password"
            className="discord-modal-input rounded px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={webhook.enabled} onChange={(e) => setWebhook({ ...webhook, enabled: e.target.checked })} />
            Enabled
          </label>
          <button
            onClick={() => saveIntegration("WEBHOOK")}
            disabled={savingIntegration === "WEBHOOK"}
            className="self-start rounded border border-border px-3 py-1.5 text-sm font-medium hover:border-accent disabled:opacity-40"
          >
            Save webhook
          </button>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Google Sheets integration</h2>
        <div className="flex flex-col gap-3">
          <input
            value={sheets.spreadsheetId}
            onChange={(e) => setSheets({ ...sheets, spreadsheetId: e.target.value })}
            placeholder="Spreadsheet ID"
            className="discord-modal-input rounded px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <input
            value={sheets.sheetName}
            onChange={(e) => setSheets({ ...sheets, sheetName: e.target.value })}
            placeholder="Sheet name (default: Sheet1)"
            className="discord-modal-input rounded px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <textarea
            value={sheets.serviceAccountJson}
            onChange={(e) => setSheets({ ...sheets, serviceAccountJson: e.target.value })}
            placeholder="Service account JSON key"
            rows={3}
            className="discord-modal-input rounded px-3 py-2 font-mono text-xs outline-none focus:border-accent"
          />
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={sheets.enabled} onChange={(e) => setSheets({ ...sheets, enabled: e.target.checked })} />
            Enabled
          </label>
          <button
            onClick={() => saveIntegration("SHEETS")}
            disabled={savingIntegration === "SHEETS"}
            className="self-start rounded border border-border px-3 py-1.5 text-sm font-medium hover:border-accent disabled:opacity-40"
          >
            Save Sheets
          </button>
        </div>
      </section>

      <section className="border-t border-border pt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-red-400">Danger zone</h2>
        <button onClick={deleteForm} className="rounded border border-red-500/40 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10">
          Delete form
        </button>
      </section>
    </main>
  );
}
