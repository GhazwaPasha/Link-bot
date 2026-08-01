"use client";

import { FIELD_TYPES, type FieldType, type FormField } from "@discord-forms/shared";

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
      {fields.map((field, index) => (
        <div key={field.id} className="rounded border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <input
              value={field.label}
              onChange={(e) => update(index, { label: e.target.value })}
              placeholder="Field label"
              maxLength={45}
              className="discord-modal-input flex-1 rounded px-3 py-1.5 text-sm outline-none focus:border-accent"
            />
            <select
              value={field.type}
              onChange={(e) => update(index, { type: e.target.value as FieldType })}
              className="discord-modal-input rounded px-2 py-1.5 text-sm outline-none focus:border-accent"
            >
              {FIELD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1.5 whitespace-nowrap text-xs text-muted">
              <input type="checkbox" checked={field.required} onChange={(e) => update(index, { required: e.target.checked })} />
              Required
            </label>
            <button onClick={() => move(index, -1)} disabled={index === 0} className="px-1 text-muted hover:text-white disabled:opacity-30">
              ↑
            </button>
            <button
              onClick={() => move(index, 1)}
              disabled={index === fields.length - 1}
              className="px-1 text-muted hover:text-white disabled:opacity-30"
            >
              ↓
            </button>
            <button onClick={() => remove(index)} className="px-1 text-red-400 hover:text-red-300">
              ✕
            </button>
          </div>

          {HAS_PLACEHOLDER.includes(field.type) && (
            <input
              value={field.placeholder ?? ""}
              onChange={(e) => update(index, { placeholder: e.target.value })}
              placeholder="Placeholder text (optional)"
              maxLength={100}
              className="discord-modal-input w-full rounded px-3 py-1.5 text-sm outline-none focus:border-accent"
            />
          )}

          {HAS_OPTIONS.includes(field.type) && (
            <div className="flex flex-col gap-2">
              {(field.options ?? []).map((opt, optIndex) => (
                <div key={optIndex} className="flex items-center gap-2">
                  <input
                    value={opt.label}
                    onChange={(e) => updateOption(index, optIndex, { label: e.target.value })}
                    placeholder="Option label"
                    className="discord-modal-input flex-1 rounded px-3 py-1.5 text-sm outline-none focus:border-accent"
                  />
                  <button onClick={() => removeOption(index, optIndex)} className="px-1 text-red-400 hover:text-red-300">
                    ✕
                  </button>
                </div>
              ))}
              <button onClick={() => addOption(index)} className="self-start text-xs font-medium text-accent hover:text-accent-hover">
                + Add option
              </button>
            </div>
          )}
        </div>
      ))}

      <button
        onClick={() => onChange([...fields, emptyField()])}
        className="rounded border border-dashed border-border py-2.5 text-sm font-medium text-muted hover:border-accent hover:text-accent"
      >
        + Add field
      </button>
    </div>
  );
}
