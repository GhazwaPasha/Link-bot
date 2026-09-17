"use client";

import { useEffect, useRef, useState } from "react";
import type { FormField } from "@discord-forms/shared";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, ImagePlus } from "lucide-react";

/** Invisible to a real visitor (aria-hidden, off-screen, no label) — a bot that fills in every field it finds trips it. Checked server-side. */
const HONEYPOT_FIELD = "_hp";

function ImageField({ field, onChange }: { field: FormField; onChange: (file: File | null) => void }) {
  const [fileName, setFileName] = useState<string | null>(null);
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-input bg-secondary/40 px-3 py-2 text-sm text-muted hover:bg-secondary/60">
      <ImagePlus className="h-4 w-4 shrink-0" />
      <span className="truncate">{fileName ?? "Choose an image…"}</span>
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          setFileName(file?.name ?? null);
          onChange(file);
        }}
      />
    </label>
  );
}

export function PublicFormRenderer({
  formId,
  formName,
  formDescription,
  fields,
}: {
  formId: string;
  formName: string;
  formDescription: string | null;
  fields: FormField[];
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [checkboxValues, setCheckboxValues] = useState<Record<string, string[]>>({});
  const [images, setImages] = useState<Record<string, File | null>>({});
  const [honeypot, setHoneypot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Tells an embedding page's embed.js how tall this content is, so a cross-origin
  // iframe embed can resize to fit instead of showing a scrollbar. Harmless no-op
  // when the page isn't actually embedded — postMessage to "*" with no listener does nothing.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const send = () => window.parent.postMessage({ type: "discord-forms:resize", height: el.scrollHeight }, "*");
    send();
    const observer = new ResizeObserver(send);
    observer.observe(el);
    return () => observer.disconnect();
  }, [submitted, error]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    for (const field of fields) {
      if (!field.required) continue;
      if (field.type === "checkbox" && (checkboxValues[field.id] ?? []).length === 0) {
        setError(`"${field.label}" is required.`);
        return;
      }
      if (field.type === "image" && !images[field.id]) {
        setError(`"${field.label}" is required.`);
        return;
      }
      if (field.type !== "checkbox" && field.type !== "image" && !values[field.id]?.trim()) {
        setError(`"${field.label}" is required.`);
        return;
      }
    }

    const formData = new FormData();
    formData.set(HONEYPOT_FIELD, honeypot);
    for (const field of fields) {
      if (field.type === "checkbox") {
        for (const v of checkboxValues[field.id] ?? []) formData.append(field.id, v);
      } else if (field.type === "image") {
        const file = images[field.id];
        if (file) formData.set(field.id, file);
      } else {
        formData.set(field.id, values[field.id] ?? "");
      }
    }

    setSubmitting(true);
    const res = await fetch(`/api/public/forms/${formId}/submit`, { method: "POST", body: formData });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong — please try again.");
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div ref={containerRef} className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-8 text-center">
        <CheckCircle2 className="h-8 w-8 text-success" />
        <p className="text-sm text-muted">Thanks — your submission has been recorded.</p>
      </div>
    );
  }

  return (
    <div ref={containerRef}>
      <h1 className="mb-1 text-xl font-semibold">{formName}</h1>
      {formDescription && <p className="mb-6 text-sm text-muted">{formDescription}</p>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Off-screen, not display:none — some bots skip display:none fields but still fill in anything technically visible to the DOM. */}
        <input
          type="text"
          name={HONEYPOT_FIELD}
          value={honeypot}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="absolute -left-[9999px] h-0 w-0 opacity-0"
          onChange={(e) => setHoneypot(e.target.value)}
        />

        {fields.map((field) => (
          <div key={field.id} className="flex flex-col gap-1.5">
            <Label>
              {field.label}
              {field.required && <span className="ml-1 text-destructive">*</span>}
            </Label>

            {field.type === "paragraph" && (
              <Textarea
                value={values[field.id] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [field.id]: e.target.value }))}
                placeholder={field.placeholder}
                rows={4}
              />
            )}

            {field.type === "short_text" && (
              <Input
                value={values[field.id] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [field.id]: e.target.value }))}
                placeholder={field.placeholder}
                maxLength={field.maxLength}
              />
            )}

            {field.type === "dropdown" && (
              <select
                value={values[field.id] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [field.id]: e.target.value }))}
                className="flex h-9 w-full rounded-md border border-input bg-secondary/40 px-3 py-1 text-sm shadow-sm"
              >
                <option value="" disabled>
                  Select…
                </option>
                {(field.options ?? []).map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}

            {field.type === "checkbox" && (
              <div className="flex flex-col gap-2">
                {(field.options ?? []).map((opt) => {
                  const checked = (checkboxValues[field.id] ?? []).includes(opt.value);
                  return (
                    <label key={opt.value} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          setCheckboxValues((v) => {
                            const current = v[field.id] ?? [];
                            return {
                              ...v,
                              [field.id]: e.target.checked ? [...current, opt.value] : current.filter((x) => x !== opt.value),
                            };
                          })
                        }
                        className="h-4 w-4 rounded border-input"
                      />
                      {opt.label}
                    </label>
                  );
                })}
              </div>
            )}

            {field.type === "image" && <ImageField field={field} onChange={(file) => setImages((v) => ({ ...v, [field.id]: file }))} />}
          </div>
        ))}

        {error && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <Button type="submit" disabled={submitting} loading={submitting}>
          Submit
        </Button>
      </form>
    </div>
  );
}
