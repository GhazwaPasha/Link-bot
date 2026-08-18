import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// DIRECT_URL bypasses Supabase's transaction-mode pooler (DATABASE_URL) — drizzle-kit needs a
// direct/session connection for migrations and introspection.
if (!process.env.DIRECT_URL) {
  throw new Error("DIRECT_URL is not set (checked packages/db/.env) — required for drizzle-kit.");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DIRECT_URL,
  },
});
