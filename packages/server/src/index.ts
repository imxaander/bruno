import dotenv from "dotenv";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
import express from "express";
import { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@bruno/shared";
import { loadConfig } from "./config.js";
import { registerSockets } from "./sockets/index.js";
import { getDb } from "./firebase/firestore.js";

dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)) });

const config = loadConfig();

// Localhost dev allows solo games (1 player); deployed games need at least 3.
const isLocalhost = /(^|\.)localhost$|^127\.0\.0\.1|^0\.0\.0\.0|^\[::1\]$/.test(
  new URL(config.clientUrl).hostname,
);

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

registerSockets(io, { minPlayers: isLocalhost ? 1 : 3 });

httpServer.listen(config.port, () => {
  console.log(`[server] BRUNO server listening on http://localhost:${config.port}`);
  console.log(
    isLocalhost
      ? "[server] localhost mode — solo games allowed (start with 1 player)"
      : "[server] deployed mode — at least 3 players required to start",
  );
  console.log(
    getDb()
      ? "[server] Firebase Firestore connected — ranks and scoring active"
      : "[server] Firebase not configured — ranks and scoring disabled",
  );
});
