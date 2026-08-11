import { existsSync } from "node:fs";
import { createServer } from "node:http";
import express from "express";
import { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@bruno/shared";
import { loadConfig } from "./config.js";
import { registerSockets } from "./sockets/index.js";

const config = loadConfig();

const app = express();
const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: config.clientUrl,
  },
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

if (existsSync(config.staticDir)) {
  app.use(express.static(config.staticDir));
  app.get("*", (req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/socket.io")) {
      next();
      return;
    }
    res.sendFile("index.html", { root: config.staticDir });
  });
  console.log(`[server] serving client from ${config.staticDir}`);
}

registerSockets(io);

httpServer.listen(config.port, () => {
  console.log(`[server] BRUNO server listening on http://localhost:${config.port}`);
});
