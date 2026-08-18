import { createServer } from "node:http";
import { db } from "@discord-forms/db";
import { sql } from "drizzle-orm";
import { env } from "./env";

export function startHealthServer() {
  const port = Number(process.env.PORT ?? 3001);
  const server = createServer((req, res) => {
    // Separate route so Render's own health check (hitting "/") stays a
    // free, instant "ok", while an external uptime monitor can be pointed
    // at "/health/db" specifically to touch Supabase on every ping — keeping
    // the project out of its 7-day inactivity auto-pause.
    if (req.url === "/health/db") {
      db.execute(sql`select 1`)
        .then(() => {
          res.writeHead(200, { "content-type": "text/plain" });
          res.end("ok");
        })
        .catch((err) => {
          console.error("[health] db ping failed:", err);
          res.writeHead(503, { "content-type": "text/plain" });
          res.end("db unreachable");
        });
      return;
    }

    // TEMPORARY diagnostic — runs the exact same REST call discord.js makes
    // as the first step of client.login(), standalone, so we can see from
    // outside whether Render's network reaches Discord's API at all —
    // independent of the gateway/WebSocket handshake that's been hanging
    // silently with no error. Remove once the login issue is resolved.
    if (req.url === "/health/discord") {
      const start = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);

      fetch("https://discord.com/api/v10/gateway/bot", {
        headers: { Authorization: `Bot ${env.DISCORD_TOKEN}` },
        signal: controller.signal,
      })
        .then(async (r) => {
          const body = await r.text();
          res.writeHead(200, { "content-type": "text/plain" });
          res.end(`status=${r.status} time=${Date.now() - start}ms body=${body}`);
        })
        .catch((err) => {
          res.writeHead(200, { "content-type": "text/plain" });
          res.end(`FAILED after ${Date.now() - start}ms: ${err.message ?? err}`);
        })
        .finally(() => clearTimeout(timeout));
      return;
    }

    res.writeHead(200, { "content-type": "text/plain" });
    res.end("ok");
  });
  server.listen(port, () => {
    console.log(`[health] listening on port ${port}`);
  });
  return server;
}
