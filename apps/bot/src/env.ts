import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  DISCORD_TOKEN: required("DISCORD_TOKEN"),
  DISCORD_CLIENT_ID: required("DISCORD_CLIENT_ID"),
  DATABASE_URL: required("DATABASE_URL"),
  DASHBOARD_URL: process.env.DASHBOARD_URL ?? "http://localhost:3000",
  PANEL_POLL_INTERVAL_MS: Number(process.env.PANEL_POLL_INTERVAL_MS ?? 20_000),
};
