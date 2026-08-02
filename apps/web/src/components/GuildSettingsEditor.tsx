"use client";

import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

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
      <h1 className="mb-2 text-2xl font-bold tracking-tight">Settings</h1>
      <p className="mb-6 text-sm text-muted">
        Members with these roles (or Manage Server) can approve/reject submissions in review channels.
      </p>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Review roles</h2>

      {roles === null && (
        <div className="mb-6 flex flex-col gap-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-2/3" />
        </div>
      )}

      {roles?.length === 0 && <p className="mb-6 text-sm text-muted">No roles found.</p>}

      {roles && roles.length > 0 && (
        <Card className="mb-6">
          <CardContent className="flex flex-col gap-3 p-4">
            {roles.map((role) => (
              <label key={role.id} className="flex cursor-pointer items-center gap-2.5 text-sm">
                <Checkbox checked={selected.has(role.id)} onCheckedChange={() => toggle(role.id)} />
                {role.name}
              </label>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving || roles === null} loading={saving}>
          Save
        </Button>
        {message && (
          <span className="flex items-center gap-1.5 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" />
            {message}
          </span>
        )}
      </div>
    </main>
  );
}
