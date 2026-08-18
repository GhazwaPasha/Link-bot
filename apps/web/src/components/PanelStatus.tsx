"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RotateCw } from "lucide-react";

/**
 * The bot's poller gives a panel exactly one attempt per failure and then stops
 * (see apps/bot/src/poller.ts) — retrying a permanently broken channel/guild
 * forever just spams the logs without ever succeeding. This is how a person
 * asks for another attempt after fixing whatever caused it.
 */
export function PanelStatus({
  guildId,
  panelId,
  messageId,
  failedAt,
  lastError,
}: {
  guildId: string;
  panelId: string;
  messageId: string | null;
  failedAt: Date | null;
  lastError: string | null;
}) {
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);

  async function retry() {
    setRetrying(true);
    const res = await fetch(`/api/guilds/${guildId}/panels/${panelId}/retry`, { method: "POST" });
    setRetrying(false);
    if (res.ok) router.refresh();
  }

  if (messageId) return <Badge>Posted</Badge>;

  if (failedAt) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="destructive" title={lastError ?? undefined}>
          Failed
        </Badge>
        <Button variant="outline" size="sm" onClick={retry} disabled={retrying} loading={retrying}>
          <RotateCw className="h-3.5 w-3.5" />
          Retry
        </Button>
      </div>
    );
  }

  return <Badge variant="secondary">Pending</Badge>;
}
