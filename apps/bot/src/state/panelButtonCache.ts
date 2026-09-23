import { db, panelButtons } from "@discord-forms/db";
import { eq } from "drizzle-orm";

/**
 * A single DB round-trip can already take 1-3s (see `handlePanelSubmit`), which
 * leaves almost no margin against Discord's 3s interaction-ack deadline. This
 * button click is the very first interaction in a form flow — there's no
 * session yet to read from, and showModal must be the *initial* response so it
 * can't be deferred — so the lookup must never hit the DB on the click path.
 *
 * The whole table is small (one row per panel button), so it's loaded once at
 * startup and fully refreshed on every panel-poller tick (~20s). That keeps
 * dashboard edits (unpublish, relabeled button, etc.) visible within one tick,
 * the same freshness the old 30s TTL gave, without ever making a real user's
 * click pay for a cold query. A miss (a button created since the last refresh)
 * still falls back to the DB.
 */
type CachedPanelButton = Awaited<ReturnType<typeof fetchPanelButton>>;

/** Safety net only — normal freshness comes from refreshPanelButtonCache. */
const CACHE_TTL_MS = 5 * 60_000;
let cache = new Map<string, { value: CachedPanelButton; expiresAt: number }>();

function fetchPanelButton(id: string) {
  return db.query.panelButtons.findFirst({
    where: eq(panelButtons.id, id),
    with: { form: true, panel: true },
  });
}

export async function refreshPanelButtonCache(): Promise<number> {
  const rows = await db.query.panelButtons.findMany({ with: { form: true, panel: true } });
  const expiresAt = Date.now() + CACHE_TTL_MS;
  // Swapped in whole so deleted buttons drop out and a click never sees a half-built map.
  cache = new Map(rows.map((row) => [row.id, { value: row, expiresAt }]));
  return rows.length;
}

export async function getPanelButtonCached(id: string): Promise<CachedPanelButton> {
  const cached = cache.get(id);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const value = await fetchPanelButton(id);
  cache.set(id, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
}
