import { db, panelButtons } from "@discord-forms/db";
import { eq } from "drizzle-orm";

/**
 * A single DB round-trip can already take 1-3s (see `handlePanelSubmit`), which
 * leaves almost no margin against Discord's 3s interaction-ack deadline. This
 * button click is the very first interaction in a form flow — there's no
 * session yet to read from — so the lookup can't be skipped, but it can be
 * cached: panel button -> form config changes rarely (only via the dashboard),
 * so a short TTL keeps clicks fast while still picking up edits (unpublish,
 * relabeled button, etc.) within a few seconds.
 */
type CachedPanelButton = Awaited<ReturnType<typeof fetchPanelButton>>;

const CACHE_TTL_MS = 30_000;
const cache = new Map<string, { value: CachedPanelButton; expiresAt: number }>();

function fetchPanelButton(id: string) {
  return db.query.panelButtons.findFirst({
    where: eq(panelButtons.id, id),
    with: { form: true, panel: true },
  });
}

export async function getPanelButtonCached(id: string): Promise<CachedPanelButton> {
  const cached = cache.get(id);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const value = await fetchPanelButton(id);
  cache.set(id, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
}
