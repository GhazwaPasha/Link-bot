"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PanelButtonStyle } from "@discord-forms/db";
import { ChannelSelect } from "./ChannelSelect";
import { DiscordChannelPreview } from "./preview/DiscordChannelPreview";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle, Plus, X } from "lucide-react";

interface FormOption {
  id: string;
  name: string;
  description: string | null;
}

interface ButtonRow {
  formId: string;
  label: string;
  style: PanelButtonStyle;
  emoji: string;
}

const STYLE_LABELS: Record<PanelButtonStyle, string> = {
  PRIMARY: "Blurple",
  SECONDARY: "Grey",
  SUCCESS: "Green",
  DANGER: "Red",
};

const MAX_BUTTONS = 5;

function emptyButton(defaultFormId: string): ButtonRow {
  return { formId: defaultFormId, label: "Submit", style: "PRIMARY", emoji: "" };
}

export function CreatePanel({ guildId, forms }: { guildId: string; forms: FormOption[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [channelId, setChannelId] = useState<string | null>(null);
  const [buttons, setButtons] = useState<ButtonRow[]>(forms.length > 0 ? [emptyButton(forms[0].id)] : []);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateButton(index: number, patch: Partial<ButtonRow>) {
    setButtons((prev) => prev.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  }

  function removeButton(index: number) {
    setButtons((prev) => prev.filter((_, i) => i !== index));
  }

  function addButton() {
    if (buttons.length >= MAX_BUTTONS || forms.length === 0) return;
    setButtons((prev) => [...prev, emptyButton(forms[0].id)]);
  }

  async function submit() {
    if (!name.trim()) {
      setError("Give the panel a name.");
      return;
    }
    if (!channelId) {
      setError("Pick a channel.");
      return;
    }
    if (buttons.length === 0) {
      setError("Add at least one button.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/guilds/${guildId}/panels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description: description || undefined,
        postChannelId: channelId,
        buttons: buttons.map((b) => ({ ...b, emoji: b.emoji || undefined })),
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to create panel.");
      return;
    }
    setName("");
    setDescription("");
    setButtons(forms.length > 0 ? [emptyButton(forms[0].id)] : []);
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
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Panel name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Staff Applications" maxLength={100} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Description (optional)</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={500} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Channel</Label>
          <ChannelSelect guildId={guildId} value={channelId} onChange={setChannelId} placeholder="Select a channel" />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Buttons</Label>
          {buttons.map((button, index) => (
            <div key={index} className="flex flex-col gap-2 rounded-md border border-border p-3">
              <div className="flex items-center gap-2">
                <Select value={button.formId} onValueChange={(v) => updateButton(index, { formId: v })}>
                  <SelectTrigger className="flex-1">
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => removeButton(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={button.label}
                  onChange={(e) => updateButton(index, { label: e.target.value })}
                  placeholder="Button label"
                  maxLength={80}
                  className="flex-1"
                />
                <Select value={button.style} onValueChange={(v) => updateButton(index, { style: v as PanelButtonStyle })}>
                  <SelectTrigger className="w-28 shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(STYLE_LABELS) as PanelButtonStyle[]).map((s) => (
                      <SelectItem key={s} value={s}>
                        {STYLE_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={button.emoji}
                  onChange={(e) => updateButton(index, { emoji: e.target.value })}
                  placeholder="Emoji"
                  maxLength={8}
                  className="w-16 shrink-0 text-center"
                />
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" className="self-start border-dashed" onClick={addButton} disabled={buttons.length >= MAX_BUTTONS}>
            <Plus className="h-3.5 w-3.5" />
            Add button
          </Button>
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
        name={name}
        description={description || undefined}
        buttons={buttons.map((b) => ({ label: b.label, style: b.style, emoji: b.emoji || undefined }))}
      />
    </Card>
  );
}
