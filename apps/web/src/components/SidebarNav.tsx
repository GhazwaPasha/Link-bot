"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileText, LayoutPanelTop, Inbox, Settings, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { label: "Overview", href: "", icon: LayoutDashboard },
  { label: "Forms", href: "/forms", icon: FileText },
  { label: "Panels", href: "/panels", icon: LayoutPanelTop },
  { label: "Submissions", href: "/submissions", icon: Inbox },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function SidebarNav({ guildId, guildName }: { guildId: string; guildName: string }) {
  const pathname = usePathname();
  const base = `/dashboard/${guildId}`;

  return (
    <nav className="flex h-screen w-56 flex-shrink-0 flex-col gap-1 border-r border-border bg-sidebar p-3">
      <div className="mb-4 truncate px-2 pt-1 text-sm font-semibold">{guildName}</div>
      {ITEMS.map((item) => {
        const href = `${base}${item.href}`;
        const active = item.href === "" ? pathname === base : pathname.startsWith(href);
        return (
          <Link
            key={item.label}
            href={href}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
              active ? "bg-primary text-primary-foreground" : "text-muted hover:bg-secondary hover:text-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
      <div className="mt-auto border-t border-border pt-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 rounded-md px-2.5 py-2 text-xs font-medium text-muted transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Switch server
        </Link>
      </div>
    </nav>
  );
}
