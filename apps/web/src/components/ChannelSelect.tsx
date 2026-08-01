"use client";

import { useEffect, useState } from "react";

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
    return <p className="text-xs text-red-400">Couldn&apos;t load channels — is the bot online?</p>;
  }

  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      disabled={!channels}
      className="discord-modal-input w-full rounded px-3 py-2 text-sm outline-none focus:border-accent disabled:opacity-50"
    >
      <option value="">{channels ? placeholder : "Loading…"}</option>
      {channels?.map((c) => (
        <option key={c.id} value={c.id}>
          #{c.name}
        </option>
      ))}
    </select>
  );
}
