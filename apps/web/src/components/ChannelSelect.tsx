"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface Channel {
  id: string;
  name: string;
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
    fetch(`/api/guilds/${guildId}/channels`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(setChannels)
      .catch(() => setFailed(true));
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
