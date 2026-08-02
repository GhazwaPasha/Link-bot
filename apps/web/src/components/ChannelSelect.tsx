"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Check, ChevronsUpDown, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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
  const [open, setOpen] = useState(false);

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

  const selected = channels.find((c) => c.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className={cn("truncate", !selected && "text-muted")}>
            {selected ? `#${selected.name}` : placeholder}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0">
        <Command>
          <CommandInput placeholder="Search channels…" />
          <CommandList>
            <CommandEmpty>No channel found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__none__"
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                <Check className={cn("h-4 w-4", value ? "opacity-0" : "opacity-100")} />
                {placeholder}
              </CommandItem>
              {channels.map((c) => (
                <CommandItem
                  key={c.id}
                  value={c.name}
                  onSelect={() => {
                    onChange(c.id);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("h-4 w-4", value === c.id ? "opacity-100" : "opacity-0")} />
                  <Hash className="h-3.5 w-3.5 shrink-0 text-muted" />
                  {c.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
