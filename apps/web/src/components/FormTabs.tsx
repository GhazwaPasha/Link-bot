"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function FormTabs({ guildId, formId }: { guildId: string; formId: string }) {
  const pathname = usePathname();
  const base = `/dashboard/${guildId}/forms/${formId}`;
  const tabs = [
    { label: "Questions", href: base },
    { label: "Submissions", href: `${base}/submissions` },
    { label: "Settings", href: `${base}/settings` },
  ];
  const active = tabs.find((t) => t.href === pathname)?.href ?? base;

  return (
    <div className="px-8 pt-4">
      <Tabs value={active}>
        <TabsList>
          {tabs.map((tab) => (
            <TabsTrigger key={tab.label} value={tab.href} asChild>
              <Link href={tab.href}>{tab.label}</Link>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}
