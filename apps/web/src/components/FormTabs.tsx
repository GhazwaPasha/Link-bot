"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function FormTabs({ guildId, formId }: { guildId: string; formId: string }) {
  const pathname = usePathname();
  const base = `/dashboard/${guildId}/forms/${formId}`;
  const tabs = [
    { label: "Questions", href: base },
    { label: "Submissions", href: `${base}/submissions` },
    { label: "Settings", href: `${base}/settings` },
  ];

  return (
    <div className="flex gap-1 border-b border-border px-8 pt-4">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.label}
            href={tab.href}
            className={`rounded-t px-4 py-2 text-sm font-medium ${
              active ? "border-b-2 border-accent text-white" : "text-muted hover:text-white"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
