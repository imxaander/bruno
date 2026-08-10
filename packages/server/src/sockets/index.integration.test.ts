import { createServer, type Server as HttpServer } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import express from "express";
import { Server as SocketServer } from "socket.io";
import { io as createClient, type Socket } from "socket.io-client";
import type { AddressInfo } from "node:net";
import type { ClientToServerEvents, PlayerView, ServerToClientEvents } from "@bruno/shared";
import { registerSockets } from "./index.js";

type Client = Socket<ServerToClientEvents, ClientToServerEvents>;

let httpServer: HttpServer;
let io: SocketServer<ClientToServerEvents, ServerToClientEvents>;
let port: number;

beforeAll(async () => {
  const app = express();
  httpServer = createServer(app);
  io = new SocketServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: { origin: "*" },
  });
  registerSockets(io);
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  port = (httpServer.address() as AddressInfo).port;
});

afterAll(async () => {
  await new Promise<void>((resolve) => io.close(() => resolve()));
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
});

function connect(): Promise<Client> {
  return new Promise((resolve, reject) => {
    const c = createClient(`http://localhost:${port}`, { transports: ["websocket"] }) as Client;
    c.on("connect", () => resolve(c));
    c.on("connect_error", (err) => reject(err));
  });
}

function once<E extends keyof ServerToClientEvents>(
  c: Client,
  event: E,
  timeout = 3000,
): Promise<Parameters<ServerToClientEvents[E]>> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting for ${event}`)), timeout);
    (
      c as unknown as {
        once: (event: string, listener: (...args: unknown[]) => void) => void;
      }
    ).once(event, (...args: unknown[]) => {
      clearTimeout(timer);
      resolve(args as Parameters<ServerToClientEvents[E]>);
    });
  });
}

describe("room lifecycle over the wire", () => {
  it("create → join → start → per-player state → leave", { timeout: 15000 }, async () => {
    const alice = await connect();
    const bob = await connect();

    const createReturn = once(alice, "rooms:create:return");
    const hostLobby = once(alice, "lobby:update");
    alice.emit("rooms:create", {
      name: "SMOKE",
      playerId: "PID-a",
      playerName: "Alice",
      maxPlayers: 4,
    });

    const [created] = await createReturn;
    if (!created.ok) {
      throw new Error(`create failed: ${created.message}`);
    }
    const gameId = created.gameId;
    expect(gameId.length).toBeGreaterThan(0);

    const [hostLobbyList] = await hostLobby;
    expect(hostLobbyList).toEqual([{ id: "PID-a", name: "Alice", isHost: true }]);

    const bobLobby = once(bob, "lobby:update");
    const aliceLobby = once(alice, "lobby:update");
    bob.emit("lobby:join", { gameId, playerId: "PID-b", playerName: "Bob" });

    const [lobbyB] = await bobLobby;
    expect(lobbyB).toHaveLength(2);
    const [lobbyA2] = await aliceLobby;
    expect(lobbyA2).toHaveLength(2);

    const nonHostStart = once(bob, "error");
    bob.emit("game:start", { gameId, playerId: "PID-b" });
    const [notHost] = await nonHostStart;
    expect(notHost).toMatchObject({ ok: false, code: "NOT_HOST" });

    const startReturn = once(alice, "game:start:return");
    const startLog = once(alice, "game:log");
    const turn = once(alice, "game:turn");
    alice.emit("game:start", { gameId, playerId: "PID-a" });

    const [started] = await startReturn;
    expect(started).toEqual({ ok: true, gameId });
    const [log] = await startLog;
    expect(log.gameId).toBe(gameId);
    const [turnPayload] = await turn;
    expect(turnPayload.playerIndex).toBeGreaterThanOrEqual(0);

    const stateA = once(alice, "game:state");
    alice.emit("game:state:get", { gameId, playerId: "PID-a" });
    const [viewA] = await stateA;
    expect(viewA.you.hand).toHaveLength(8);
    expect(viewA.players).toHaveLength(2);
    expect(viewA.pileTop).not.toBeNull();
    expect(viewA.deckCount).toBe(110 - 17);
    expect(JSON.stringify(viewA)).not.toContain('"pile":');
    for (const player of viewA.players) {
      expect(Object.keys(player)).not.toContain("hand");
    }

    const stateB = once(bob, "game:state");
    bob.emit("game:state:get", { gameId, playerId: "PID-b" });
    const [viewB] = await stateB;
    expect(viewB.you.hand).toHaveLength(8);

    const listAfterLeave = once(alice, "rooms:list:return");
    bob.emit("lobby:leave", { gameId, playerId: "PID-b" });
    const [roomsAfterLeave] = await listAfterLeave;
    expect(roomsAfterLeave).toHaveLength(0);

    const stateAfterLeave = once(alice, "game:state");
    alice.emit("game:state:get", { gameId, playerId: "PID-a" });
    const [viewAfter] = await stateAfterLeave;
    expect(viewAfter.players).toHaveLength(1);

    const listAfterDelete = once(alice, "rooms:list:return");
    alice.emit("lobby:leave", { gameId, playerId: "PID-a" });
    const [roomsAfterDelete] = await listAfterDelete;
    expect(roomsAfterDelete).toHaveLength(0);

    const badAction = once(alice, "error");
    alice.emit("game:action", { gameId, type: "play", playerId: "PID-a", cardIndex: 0 });
    const [actionError] = await badAction;
    expect(actionError.code).toBe("NOT_IMPLEMENTED");

    alice.disconnect();
    bob.disconnect();
  });
});
