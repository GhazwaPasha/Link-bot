"use client";

const STYLE_COLOR: Record<string, string> = {
  PRIMARY: "#5865F2",
  SECONDARY: "#4e5058",
  SUCCESS: "#248046",
  DANGER: "#da373c",
};

export interface PreviewButton {
  label: string;
  style: "PRIMARY" | "SECONDARY" | "SUCCESS" | "DANGER";
  emoji?: string;
}

export function DiscordChannelPreview({
  name,
  description,
  buttons,
}: {
  name: string;
  description?: string;
  buttons: PreviewButton[];
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
            <p className="text-sm font-semibold text-white">{name || "Untitled panel"}</p>
            {description && <p className="mt-1 text-xs text-[#b5bac1]">{description}</p>}
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            {buttons.length === 0 && <p className="text-xs text-[#6d6f78]">Add a button to see it here.</p>}
            {buttons.map((b, i) => (
              <button
                key={i}
                disabled
                style={{ backgroundColor: STYLE_COLOR[b.style] }}
                className="rounded px-4 py-1.5 text-sm font-medium text-white opacity-90"
              >
                {b.emoji && <span className="mr-1.5">{b.emoji}</span>}
                {b.label || "Submit"}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
