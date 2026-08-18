import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __dbClient: ReturnType<typeof postgres> | undefined;
}

// DATABASE_URL is Supabase's pooled connection (PgBouncer, transaction mode) — prepare: false
// is required there since a transaction-mode pooler doesn't hold session state across
// statements, so server-side prepared statements can't be reused safely.
const client = global.__dbClient ?? postgres(process.env.DATABASE_URL!, { prepare: false });

if (process.env.NODE_ENV !== "production") {
  global.__dbClient = client;
}

export const db = drizzle(client, { schema });
export * from "./schema";
