"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { label: "Overview", href: "" },
  { label: "Forms", href: "/forms" },
  { label: "Panels", href: "/panels" },
  { label: "Submissions", href: "/submissions" },
  { label: "Settings", href: "/settings" },
];

export function SidebarNav({ guildId, guildName }: { guildId: string; guildName: string }) {
  const pathname = usePathname();
  const base = `/dashboard/${guildId}`;

  return (
    <nav className="flex h-screen w-56 flex-shrink-0 flex-col gap-1 border-r border-border bg-sidebar p-4">
      <div className="mb-6 truncate px-2 text-sm font-semibold text-muted">{guildName}</div>
      {ITEMS.map((item) => {
        const href = `${base}${item.href}`;
        const active = item.href === "" ? pathname === base : pathname.startsWith(href);
        return (
          <Link
            key={item.label}
            href={href}
            className={`rounded px-3 py-2 text-sm font-medium transition ${
              active ? "bg-accent text-white" : "text-muted hover:bg-card hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
      <div className="mt-auto px-2 pt-4">
        <Link href="/dashboard" className="text-xs text-muted hover:text-white">
          ← Switch server
        </Link>
      </div>
    </nav>
  );
}
