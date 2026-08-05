import { createServer } from "node:http";
import { prisma } from "@discord-forms/db";

export function startHealthServer() {
  const port = Number(process.env.PORT ?? 3001);
  const server = createServer((req, res) => {
    // Separate route so Render's own health check (hitting "/") stays a
    // free, instant "ok", while an external uptime monitor can be pointed
    // at "/health/db" specifically to touch Supabase on every ping — keeping
    // the project out of its 7-day inactivity auto-pause.
    if (req.url === "/health/db") {
      prisma
        .$queryRaw`SELECT 1`
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

    res.writeHead(200, { "content-type": "text/plain" });
    res.end("ok");
  });
  server.listen(port, () => {
    console.log(`[health] listening on port ${port}`);
  });
  return server;
}
