import { createServer } from "node:http";

export function startHealthServer() {
  const port = Number(process.env.PORT ?? 3001);
  const server = createServer((_req, res) => {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("ok");
  });
  server.listen(port, () => {
    console.log(`[health] listening on port ${port}`);
  });
  return server;
}
