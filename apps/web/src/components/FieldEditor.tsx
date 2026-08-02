"use client";

import { FIELD_TYPES, type FieldType, type FormField } from "@discord-forms/shared";
import { ChevronUp, ChevronDown, X, Plus, GripVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const TYPE_LABELS: Record<FieldType, string> = {
  short_text: "Short text",
  paragraph: "Paragraph",
  dropdown: "Dropdown",
  checkbox: "Checkboxes",
  user_select: "User select",
  role_select: "Role select",
  channel_select: "Channel select",
};

const HAS_OPTIONS: FieldType[] = ["dropdown", "checkbox"];
const HAS_PLACEHOLDER: FieldType[] = ["short_text", "paragraph"];

function newFieldId() {
  return crypto.randomUUID().slice(0, 8);
}

function emptyField(): FormField {
  return { id: newFieldId(), type: "short_text", label: "", required: true };
}

export function FieldEditor({ fields, onChange }: { fields: FormField[]; onChange: (fields: FormField[]) => void }) {
  function update(index: number, patch: Partial<FormField>) {
    const next = [...fields];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  }

  function remove(index: number) {
    onChange(fields.filter((_, i) => i !== index));
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= fields.length) return;
    const next = [...fields];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function addOption(index: number) {
    const field = fields[index];
    const options = [...(field.options ?? []), { label: "", value: newFieldId() }];
    update(index, { options });
  }

  function updateOption(index: number, optIndex: number, patch: Partial<{ label: string; value: string }>) {
    const field = fields[index];
    const options = [...(field.options ?? [])];
    options[optIndex] = { ...options[optIndex], ...patch };
    update(index, { options });
  }

  function removeOption(index: number, optIndex: number) {
    const field = fields[index];
    update(index, { options: (field.options ?? []).filter((_, i) => i !== optIndex) });
  }

  return (
    <div className="flex flex-col gap-3">
      {fields.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted">
          No fields yet — add one below to start building your form.
        </div>
      )}

      {fields.map((field, index) => (
        <div key={field.id} className="rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <GripVertical className="h-4 w-4 shrink-0 text-muted" />
            <Input
              value={field.label}
              onChange={(e) => update(index, { label: e.target.value })}
              placeholder="Field label"
              maxLength={45}
              className="flex-1"
            />
            <Select value={field.type} onValueChange={(v) => update(index, { type: v as FieldType })}>
              <SelectTrigger className="w-44 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs text-muted">
              <Checkbox checked={field.required} onCheckedChange={(c) => update(index, { required: c === true })} />
              Required
            </label>
            <div className="flex shrink-0 items-center">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => move(index, -1)}
                disabled={index === 0}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => move(index, 1)}
                disabled={index === fields.length - 1}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => remove(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {HAS_PLACEHOLDER.includes(field.type) && (
            <Input
              value={field.placeholder ?? ""}
              onChange={(e) => update(index, { placeholder: e.target.value })}
              placeholder="Placeholder text (optional)"
              maxLength={100}
              className="ml-6"
            />
          )}

          {HAS_OPTIONS.includes(field.type) && (
            <div className="ml-6 flex flex-col gap-2">
              {(field.options ?? []).map((opt, optIndex) => (
                <div key={optIndex} className="flex items-center gap-2">
                  <Input
                    value={opt.label}
                    onChange={(e) => updateOption(index, optIndex, { label: e.target.value })}
                    placeholder="Option label"
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => removeOption(index, optIndex)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="link" size="sm" className="h-auto self-start p-0" onClick={() => addOption(index)}>
                <Plus className="h-3.5 w-3.5" />
                Add option
              </Button>
            </div>
          )}
        </div>
      ))}

      <Button variant="outline" className="border-dashed" onClick={() => onChange([...fields, emptyField()])}>
        <Plus className="h-4 w-4" />
        Add field
      </Button>
    </div>
  );
}
