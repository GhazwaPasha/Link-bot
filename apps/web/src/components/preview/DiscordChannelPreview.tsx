"use client";

export function DiscordChannelPreview({
  formName,
  description,
  buttonLabel,
}: {
  formName: string;
  description?: string;
  buttonLabel: string;
}) {
  return (
    <div className="w-full max-w-sm overflow-hidden rounded-lg border border-[#3a3b45] bg-[#313338]">
      <div className="flex items-center gap-2 border-b border-[#232428] px-4 py-2.5 text-[#96989d]">
        <span className="text-lg leading-none">#</span>
        <span className="text-sm font-semibold text-white">form-panel</span>
      </div>

      <div className="flex gap-3 px-4 py-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
          F
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-semibold text-white">Forms Bot</span>
            <span className="rounded bg-accent px-1 py-px text-[10px] font-medium text-white">APP</span>
            <span className="text-xs text-[#6d6f78]">Today at 12:00 PM</span>
          </div>

          <div className="mt-1.5 rounded border-l-4 border-accent bg-[#2b2d31] p-3">
            <p className="text-sm font-semibold text-white">{formName || "Untitled form"}</p>
            {description && <p className="mt-1 text-xs text-[#b5bac1]">{description}</p>}
          </div>

          <button disabled className="mt-2 rounded bg-accent px-4 py-1.5 text-sm font-medium text-white opacity-90">
            {buttonLabel || "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
