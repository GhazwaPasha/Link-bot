"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChannelSelect } from "./ChannelSelect";
import { DiscordChannelPreview } from "./preview/DiscordChannelPreview";

interface FormOption {
  id: string;
  name: string;
  description: string | null;
}

export function CreatePanel({ guildId, forms }: { guildId: string; forms: FormOption[] }) {
  const router = useRouter();
  const [formId, setFormId] = useState(forms[0]?.id ?? "");
  const [channelId, setChannelId] = useState<string | null>(null);
  const [buttonLabel, setButtonLabel] = useState("Submit");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedForm = forms.find((f) => f.id === formId);

  async function submit() {
    if (!channelId) {
      setError("Pick a channel.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/forms/${formId}/panels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postChannelId: channelId, buttonLabel }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to create panel.");
      return;
    }
    router.refresh();
  }

  if (forms.length === 0) {
    return <p className="text-sm text-muted">Publish a form first to be able to post a panel.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-8 rounded border border-border bg-card p-5">
      <div className="flex flex-col gap-3">
        <div>
          <label className="mb-1 block text-xs text-muted">Form</label>
          <select
            value={formId}
            onChange={(e) => setFormId(e.target.value)}
            className="discord-modal-input w-full rounded px-3 py-2 text-sm outline-none focus:border-accent"
          >
            {forms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">Channel</label>
          <ChannelSelect guildId={guildId} value={channelId} onChange={setChannelId} placeholder="Select a channel" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">Button label</label>
          <input
            value={buttonLabel}
            onChange={(e) => setButtonLabel(e.target.value)}
            maxLength={80}
            className="discord-modal-input w-full rounded px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          onClick={submit}
          disabled={submitting}
          className="self-start rounded bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-40"
        >
          Post panel
        </button>
      </div>
      <DiscordChannelPreview formName={selectedForm?.name ?? ""} description={selectedForm?.description ?? undefined} buttonLabel={buttonLabel} />
    </div>
  );
}
