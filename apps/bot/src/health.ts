import { createServer } from "node:http";
import { db } from "@discord-forms/db";
import { sql } from "drizzle-orm";
import { getHealth } from "./telemetry";

export function startHealthServer() {
  const port = Number(process.env.PORT ?? 3001);
  const server = createServer((req, res) => {
    // "/" stays a free, instant liveness "ok" (process is up), while an external
    // uptime monitor can be pointed at "/health/db" specifically to touch Supabase
    // on every ping — keeping the project out of its 7-day inactivity auto-pause.
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

    // Readiness: 200 only while the gateway session is READY and the event loop
    // hasn't frozen badly in the last minute — i.e. the bot can actually answer a
    // click within Discord's 3s window right now. Point an uptime monitor here.
    if (req.url === "/health") {
      const health = getHealth();
      res.writeHead(health.healthy ? 200 : 503, { "content-type": "application/json" });
      res.end(JSON.stringify(health));
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
