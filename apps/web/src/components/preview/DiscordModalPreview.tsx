"use client";

import type { FormField } from "@discord-forms/shared";
import { isSelectField } from "@discord-forms/shared";

/**
 * Mocks the native Discord modal chrome. No public library replicates this, so
 * it's a hand-built approximation matching Discord's actual modal styling.
 */
export function DiscordModalPreview({ title, fields }: { title: string; fields: FormField[] }) {
  const textFields = fields.filter((f) => !isSelectField(f.type));
  const selectFields = fields.filter((f) => isSelectField(f.type));

  return (
    <div className="w-full max-w-sm overflow-hidden rounded-lg border border-[#3a3b45] bg-[#2b2d31] shadow-xl">
      <div className="flex items-center justify-between border-b border-[#232428] px-4 py-3">
        <span className="text-sm font-semibold text-white">{title || "Untitled form"}</span>
        <span className="text-lg leading-none text-[#96989d]">×</span>
      </div>

      <div className="max-h-80 space-y-4 overflow-y-auto px-4 py-4">
        {textFields.length === 0 && selectFields.length === 0 && (
          <p className="text-xs text-[#96989d]">Add a field to see it here.</p>
        )}

        {selectFields.length > 0 && (
          <div className="rounded border border-dashed border-[#4a4c56] p-2 text-[11px] text-[#96989d]">
            {selectFields.length} select field{selectFields.length > 1 ? "s" : ""} ({selectFields.map((f) => f.label).join(", ")}) are
            collected in a menu step right before this modal opens.
          </div>
        )}

        {textFields.map((field) => (
          <div key={field.id}>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#dbdee1]">
              {field.label || "Untitled field"}
              {field.required && <span className="ml-1 text-red-400">*</span>}
            </label>
            {field.type === "paragraph" ? (
              <textarea
                disabled
                placeholder={field.placeholder}
                rows={3}
                className="discord-modal-input w-full resize-none rounded px-2.5 py-2 text-sm text-[#dbdee1] placeholder:text-[#6d6f78]"
              />
            ) : (
              <input
                disabled
                placeholder={field.placeholder}
                className="discord-modal-input w-full rounded px-2.5 py-2 text-sm text-[#dbdee1] placeholder:text-[#6d6f78]"
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2 border-t border-[#232428] px-4 py-3">
        <button disabled className="rounded px-4 py-2 text-sm font-medium text-[#dbdee1] opacity-80">
          Cancel
        </button>
        <button disabled className="rounded bg-accent px-4 py-2 text-sm font-medium text-white opacity-90">
          Submit
        </button>
      </div>
    </div>
  );
}
