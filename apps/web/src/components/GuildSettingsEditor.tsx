"use client";

import { useEffect, useState } from "react";

interface Role {
  id: string;
  name: string;
}

export function GuildSettingsEditor({ guildId, initialReviewRoleIds }: { guildId: string; initialReviewRoleIds: string[] }) {
  const [roles, setRoles] = useState<Role[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set(initialReviewRoleIds));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/guilds/${guildId}/roles`)
      .then((res) => res.json())
      .then(setRoles)
      .catch(() => setRoles([]));
  }, [guildId]);

  function toggle(roleId: string) {
    const next = new Set(selected);
    if (next.has(roleId)) next.delete(roleId);
    else next.add(roleId);
    setSelected(next);
  }

  async function save() {
    setSaving(true);
    await fetch(`/api/guilds/${guildId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewRoleIds: Array.from(selected) }),
    });
    setSaving(false);
    setMessage("Saved.");
  }

  return (
    <main className="max-w-xl p-8">
      <h1 className="mb-2 text-2xl font-bold">Settings</h1>
      <p className="mb-6 text-sm text-muted">
        Members with these roles (or Manage Server) can approve/reject submissions in review channels.
      </p>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Review roles</h2>
      {roles === null && <p className="text-sm text-muted">Loading roles…</p>}
      {roles?.length === 0 && <p className="text-sm text-muted">No roles found.</p>}

      <div className="mb-6 flex flex-col gap-2">
        {roles?.map((role) => (
          <label key={role.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={selected.has(role.id)} onChange={() => toggle(role.id)} />
            {role.name}
          </label>
        ))}
      </div>

      {message && <p className="mb-3 text-sm text-accent">{message}</p>}
      <button
        onClick={save}
        disabled={saving || roles === null}
        className="rounded bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-40"
      >
        Save
      </button>
    </main>
  );
}
