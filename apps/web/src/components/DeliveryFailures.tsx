"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface DeliveryFailure {
  id: string;
  createdAt: string;
  lastError: string | null;
}

/**
 * Web submissions are saved before they're posted to Discord, and the bot retries
 * transient failures on its own (apps/bot/src/deliveryPoller.ts). What reaches
 * this list gave up — usually a deleted review/output channel or missing bot
 * permissions. The submission itself is safe in the DB; Retry re-queues it once
 * the cause is fixed.
 */
export function DeliveryFailures({ guildId, failures }: { guildId: string; failures: DeliveryFailure[] }) {
  const router = useRouter();
  const [retrying, setRetrying] = useState<string | null>(null);

  if (failures.length === 0) return null;

  async function retry(id: string) {
    setRetrying(id);
    const res = await fetch(`/api/guilds/${guildId}/submissions/${id}/retry`, { method: "POST" });
    setRetrying(null);
    if (res.ok) router.refresh();
  }

  return (
    <div className="mx-8 mt-4 rounded-md border border-destructive/40 bg-destructive/5 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-destructive">
        <AlertTriangle className="h-4 w-4" />
        {failures.length} web submission{failures.length === 1 ? "" : "s"} couldn&apos;t be delivered to Discord
      </div>
      <p className="mt-1 text-xs text-muted">
        They&apos;re saved — check the form&apos;s review/output channel and the bot&apos;s permissions there, then retry.
      </p>
      <ul className="mt-3 space-y-2">
        {failures.map((f) => (
          <li key={f.id} className="flex items-center justify-between gap-3 text-xs">
            <span className="min-w-0 truncate" title={f.lastError ?? undefined}>
              {new Date(f.createdAt).toLocaleString()} — {f.lastError ?? "Unknown error"}
            </span>
            <Button variant="outline" size="sm" onClick={() => retry(f.id)} disabled={retrying !== null} loading={retrying === f.id}>
              <RotateCw className="h-3.5 w-3.5" />
              Retry
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
