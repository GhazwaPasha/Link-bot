"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface Channel {
  id: string;
  name: string;
}

// Shared across every mounted ChannelSelect for a guild so N inputs on one page (e.g. Review +
// Output channel) issue one request instead of racing Discord's rate limit with N parallel calls.
const channelFetchCache = new Map<string, Promise<Channel[]>>();

function fetchGuildChannels(guildId: string): Promise<Channel[]> {
  let promise = channelFetchCache.get(guildId);
  if (!promise) {
    promise = fetch(`/api/guilds/${guildId}/channels`).then((res) => {
      if (!res.ok) throw new Error(`Failed to load channels (${res.status})`);
      return res.json();
    });
    channelFetchCache.set(guildId, promise);
    promise.catch(() => channelFetchCache.delete(guildId));
  }
  return promise;
}

export function ChannelSelect({
  guildId,
  value,
  onChange,
  placeholder = "None",
}: {
  guildId: string;
  value: string | null;
  onChange: (channelId: string | null) => void;
  placeholder?: string;
}) {
  const [channels, setChannels] = useState<Channel[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setChannels(null);
    setFailed(false);
    fetchGuildChannels(guildId)
      .then((data) => {
        if (!cancelled) setChannels(data);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [guildId]);

  if (failed) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-destructive">
        <AlertTriangle className="h-3.5 w-3.5" />
        Couldn&apos;t load channels — is the bot online?
      </p>
    );
  }

  if (!channels) return <Skeleton className="h-9 w-full" />;

  return (
    <Select value={value ?? "__none__"} onValueChange={(v) => onChange(v === "__none__" ? null : v)}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">{placeholder}</SelectItem>
        {channels.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            #{c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
