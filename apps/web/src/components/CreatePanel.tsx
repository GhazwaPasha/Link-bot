"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChannelSelect } from "./ChannelSelect";
import { DiscordChannelPreview } from "./preview/DiscordChannelPreview";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

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
    return (
      <Card className="border-dashed p-6 text-center text-sm text-muted">
        Publish a form first to be able to post a panel.
      </Card>
    );
  }

  return (
    <Card className="grid grid-cols-1 gap-8 p-5 lg:grid-cols-2">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Form</Label>
          <Select value={formId} onValueChange={setFormId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {forms.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Channel</Label>
          <ChannelSelect guildId={guildId} value={channelId} onChange={setChannelId} placeholder="Select a channel" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Button label</Label>
          <Input value={buttonLabel} onChange={(e) => setButtonLabel(e.target.value)} maxLength={80} />
        </div>
        {error && (
          <div className="flex items-center gap-1.5 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
        <Button onClick={submit} disabled={submitting} loading={submitting} className="self-start">
          Post panel
        </Button>
      </div>
      <DiscordChannelPreview
        formName={selectedForm?.name ?? ""}
        description={selectedForm?.description ?? undefined}
        buttonLabel={buttonLabel}
      />
    </Card>
  );
}
