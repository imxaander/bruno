import { createServer, type Server as HttpServer } from "node:http";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import express from "express";
import { Server as SocketServer } from "socket.io";
import { io as createClient, type Socket } from "socket.io-client";
import type { AddressInfo } from "node:net";
import type {
  Card,
  ClientToServerEvents,
  Color,
  PlayerView,
  ServerToClientEvents,
} from "@bruno/shared";
import { CARDS } from "@bruno/shared";
import type { Room } from "../game/room.js";
import type { RoomManager } from "../game/room-manager.js";
import { TurnManager } from "../game/turn-manager.js";
import { registerSockets } from "./index.js";

type Client = Socket<ServerToClientEvents, ClientToServerEvents>;

class ManualTimers {
  private entries = new Set<() => void>();

  set = (callback: () => void): { cancel: () => void } => {
    this.entries.add(callback);
    return {
      cancel: () => {
        this.entries.delete(callback);
      },
    };
  };

  fireAll(): void {
    for (const callback of [...this.entries]) {
      this.entries.delete(callback);
      callback();
    }
  }
}

let httpServer: HttpServer;
let io: SocketServer<ClientToServerEvents, ServerToClientEvents>;
let port: number;
let rooms: RoomManager;
let timers: ManualTimers;

beforeAll(async () => {
  const app = express();
  httpServer = createServer(app);
  io = new SocketServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: { origin: "*" },
  });
  timers = new ManualTimers();
  rooms = registerSockets(io, {
    turnManager: new TurnManager(5000, timers.set),
    startOptions: { locationId: null, mayhemEventId: null, originId: null },
    minPlayers: 2,
  });
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  port = (httpServer.address() as AddressInfo).port;
});

afterAll(async () => {
  await new Promise<void>((resolve) => io.close(() => resolve()));
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
});

afterEach(() => {
  timers.fireAll();
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

function makeCard(overrides: Partial<Card>): Card {
  return {
    id: "c",
    name: "card",
    type: "number",
    tags: [],
    effect: "",
    source: "test",
    status: "stable",
    ...overrides,
  };
}

async function setupGame(alice: Client, bob: Client): Promise<string> {
  const createReturn = once(alice, "rooms:create:return");
  alice.emit("rooms:create", {
    name: "WIRE",
    playerId: "PID-a",
    playerName: "Alice",
    maxPlayers: 4,
  });
  const [created] = await createReturn;
  if (!created.ok) {
    throw new Error(`create failed: ${created.message}`);
  }
  const gameId = created.gameId;

  bob.emit("lobby:join", { gameId, playerId: "PID-b", playerName: "Bob" });
  await once(bob, "lobby:update");

  const startReturn = once(alice, "game:start:return");
  const bobState = once(bob, "game:state");
  alice.emit("game:start", { gameId, playerId: "PID-a" });
  const [started] = await startReturn;
  if (!started.ok) {
    throw new Error("start failed");
  }
  await bobState;
  return gameId;
}

async function engineer(
  room: Room | null,
  changes: {
    pile?: Card;
    activeColor?: Color;
    currentTurnIndex?: number;
    pendingDraw?: number;
    aliceHand?: Card[];
  },
): Promise<void> {
  if (!room) {
    throw new Error("room not found");
  }
  if (changes.pile) {
    room.pile = [changes.pile];
  }
  if (changes.activeColor !== undefined) {
    room.activeColor = changes.activeColor;
  }
  if (changes.currentTurnIndex !== undefined) {
    room.currentTurnIndex = changes.currentTurnIndex;
  }
  if (changes.pendingDraw !== undefined) {
    room.pendingDraw = changes.pendingDraw;
  }
  if (changes.aliceHand) {
    room.players[0]!.hand = changes.aliceHand;
  }
}

function assertNoLeaks(view: PlayerView): void {
  const serialized = JSON.stringify(view);
  expect(serialized).not.toContain('"pile":');
  for (const player of view.players) {
    expect(Object.keys(player)).not.toContain("hand");
  }
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
    expect(viewA.deckCount).toBe(115 - 17);
    assertNoLeaks(viewA);

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
    expect(actionError.code).toBe("ROOM_NOT_FOUND");

    alice.disconnect();
    bob.disconnect();
  });

  it("plays a card and pushes per-player state to the room", { timeout: 15000 }, async () => {
    const alice = await connect();
    const bob = await connect();
    const gameId = await setupGame(alice, bob);

    await engineer(rooms.getRoom(gameId), {
      pile: makeCard({ id: "red-5", name: "5", type: "number", color: "red", number: 5 }),
      activeColor: "red",
      currentTurnIndex: 0,
      pendingDraw: 0,
      aliceHand: [
        makeCard({ id: "red-7", name: "7", type: "number", color: "red", number: 7 }),
        makeCard({ id: "red-9", name: "9", type: "number", color: "red", number: 9 }),
      ],
    });

    const logEvent = once(alice, "game:log");
    const turnEvent = once(alice, "game:turn");
    const stateA = once(alice, "game:state");
    const stateB = once(bob, "game:state");
    alice.emit("game:action", { gameId, type: "play", playerId: "PID-a", cardIndex: 0 });

    const [log] = await logEvent;
    expect(log.message).toContain("plays");
    const [turn] = await turnEvent;
    expect(turn.playerIndex).toBe(1);
    const [viewA] = await stateA;
    expect(viewA.you.hand).toHaveLength(1);
    expect(viewA.pileTop?.id).toBe("red-7");
    expect(viewA.currentTurnIndex).toBe(1);
    expect(viewA.pendingDraw).toBe(0);
    assertNoLeaks(viewA);
    const [viewB] = await stateB;
    expect(viewB.you.hand).toHaveLength(8);
    expect(viewB.players.find((player) => player.id === "PID-a")?.handCount).toBe(1);

    alice.disconnect();
    bob.disconnect();
  });

  it(
    "prompts the actor for +4 color and completes the play once chosen",
    { timeout: 15000 },
    async () => {
      const alice = await connect();
      const bob = await connect();
      const gameId = await setupGame(alice, bob);

      await engineer(rooms.getRoom(gameId), {
        pile: makeCard({ id: "red-5", name: "5", type: "number", color: "red", number: 5 }),
        activeColor: "red",
        currentTurnIndex: 0,
        pendingDraw: 0,
        aliceHand: [
          makeCard({ id: "d4", name: "Draw 4", type: "draw4", tags: ["wild"] }),
          makeCard({ id: "red-3", name: "3", type: "number", color: "red", number: 3 }),
        ],
      });

      alice.emit("game:action", { gameId, type: "play", playerId: "PID-a", cardIndex: 0 });
      const [prompt] = await once(alice, "game:prompt");
      expect(prompt.kind).toBe("choose-color");

      const logEvent = once(alice, "game:log");
      const turnEvent = once(alice, "game:turn");
      alice.emit("game:action", {
        gameId,
        type: "choose-color",
        playerId: "PID-a",
        chosenColor: "green",
      });
      const [log] = await logEvent;
      expect(log.message).toContain("+4");
      const [turn] = await turnEvent;
      expect(turn.playerIndex).toBe(1);

      const stateA = once(alice, "game:state");
      alice.emit("game:state:get", { gameId, playerId: "PID-a" });
      const [viewA] = await stateA;
      expect(viewA.you.hand).toHaveLength(1);
      expect(viewA.pileTop?.type).toBe("draw4");
      expect(viewA.activeColor).toBe("green");
      expect(viewA.pendingDraw).toBe(4);
      assertNoLeaks(viewA);

      alice.disconnect();
      bob.disconnect();
    },
  );

  it(
    "prompts the actor to pick a vault effect and completes the play once chosen",
    { timeout: 15000 },
    async () => {
      const alice = await connect();
      const bob = await connect();
      const gameId = await setupGame(alice, bob);

      await engineer(rooms.getRoom(gameId), {
        pile: makeCard({ id: "red-5", name: "5", type: "number", color: "red", number: 5 }),
        activeColor: "red",
        currentTurnIndex: 0,
        pendingDraw: 0,
        aliceHand: [
          makeCard({
            id: "vault-silver-token-0",
            name: "Silver Vault",
            type: "vault-silver",
            tags: ["wild"],
          }),
          makeCard({ id: "red-3", name: "3", type: "number", color: "red", number: 3 }),
        ],
      });

      alice.emit("game:action", { gameId, type: "play", playerId: "PID-a", cardIndex: 0 });
      const [prompt] = await once(alice, "game:prompt");
      if (prompt.kind !== "vault-choice") {
        throw new Error("expected a vault-choice prompt");
      }
      expect(prompt.offers).toHaveLength(3);
      expect(prompt.offers.every((offer) => offer.type === "vault-silver")).toBe(true);
      expect(new Set(prompt.offers.map((offer) => offer.id)).size).toBe(3);

      const room = rooms.getRoom(gameId);
      if (!room?.pendingVault) {
        throw new Error("expected a pending vault");
      }
      const chosen = CARDS.find((card) => card.id === "t3-mitosis");
      if (!chosen) {
        throw new Error("missing t3-mitosis card");
      }
      room.pendingVault.offers = [chosen];
      const logEvent = once(alice, "game:log");
      const turnEvent = once(alice, "game:turn");
      const effectEvent = once(alice, "game:effect");
      alice.emit("game:action", {
        gameId,
        type: "vault-choice",
        playerId: "PID-a",
        cardId: chosen.id,
      });
      const [log] = await logEvent;
      expect(log.message).toContain("plays");
      const [turn] = await turnEvent;
      expect(turn.playerIndex).toBe(1);
      const [effect] = await effectEvent;
      expect(effect).toMatchObject({
        gameId,
        playerId: "PID-a",
        cardId: chosen.id,
        name: chosen.name,
        tier: "vault-silver",
      });
      expect(effect.lines.length).toBeGreaterThan(0);

      const stateA = once(alice, "game:state");
      alice.emit("game:state:get", { gameId, playerId: "PID-a" });
      const [viewA] = await stateA;
      expect(viewA.you.hand).toHaveLength(1);
      expect(viewA.pileTop?.type).toBe("vault-silver");
      expect(viewA.activeColor).toBe("red");
      expect(viewA.currentTurnIndex).toBe(1);
      assertNoLeaks(viewA);

      alice.disconnect();
      bob.disconnect();
    },
  );

  it(
    "alerts and re-prompts when an unaffordable play-condition offer is picked (t2-ruin)",
    { timeout: 15000 },
    async () => {
      const alice = await connect();
      const bob = await connect();
      const gameId = await setupGame(alice, bob);

      await engineer(rooms.getRoom(gameId), {
        pile: makeCard({ id: "red-5", name: "5", type: "number", color: "red", number: 5 }),
        activeColor: "red",
        currentTurnIndex: 0,
        pendingDraw: 0,
        aliceHand: [
          makeCard({
            id: "vault-silver-token-0",
            name: "Silver Vault",
            type: "vault-silver",
            tags: ["wild"],
          }),
          makeCard({ id: "red-3", name: "3", type: "number", color: "red", number: 3 }),
        ],
      });

      alice.emit("game:action", { gameId, type: "play", playerId: "PID-a", cardIndex: 0 });
      const [vaultPrompt] = await once(alice, "game:prompt");
      if (vaultPrompt.kind !== "vault-choice") {
        throw new Error("expected a vault-choice prompt");
      }

      const room = rooms.getRoom(gameId);
      if (!room?.pendingVault) {
        throw new Error("expected a pending vault");
      }
      room.pendingVault.offers = [CARDS.find((card) => card.id === "t2-ruin")!];

      const alertEvent = once(alice, "game:alert");
      const rePrompt = once(alice, "game:prompt");
      alice.emit("game:action", {
        gameId,
        type: "vault-choice",
        playerId: "PID-a",
        cardId: "t2-ruin",
      });
      const [alert] = await alertEvent;
      expect(alert).toEqual({
        gameId,
        message: "You need 5 red cards to play Ruin.",
      });
      const [reEmitted] = await rePrompt;
      expect(reEmitted).toMatchObject({ gameId, kind: "vault-choice" });
      expect(room.pendingVault?.chosenCardId).toBeUndefined();
      expect(room.players[0]!.hand).toHaveLength(2);

      room.pendingVault.offers = [CARDS.find((card) => card.id === "t3-mitosis")!];
      const logEvent = once(alice, "game:log");
      const turnEvent = once(alice, "game:turn");
      alice.emit("game:action", {
        gameId,
        type: "vault-choice",
        playerId: "PID-a",
        cardId: "t3-mitosis",
      });
      const [log] = await logEvent;
      expect(log.message).toContain("plays");
      const [turn] = await turnEvent;
      expect(turn.playerIndex).toBe(1);

      alice.disconnect();
      bob.disconnect();
    },
  );

  it(
    "prompts the actor to pick targets after choosing a target-taking vault effect",
    { timeout: 15000 },
    async () => {
      const alice = await connect();
      const bob = await connect();
      const gameId = await setupGame(alice, bob);

      await engineer(rooms.getRoom(gameId), {
        pile: makeCard({ id: "red-5", name: "5", type: "number", color: "red", number: 5 }),
        activeColor: "red",
        currentTurnIndex: 0,
        pendingDraw: 0,
        aliceHand: [
          makeCard({
            id: "vault-silver-token-0",
            name: "Silver Vault",
            type: "vault-silver",
            tags: ["wild"],
          }),
          makeCard({ id: "red-3", name: "3", type: "number", color: "red", number: 3 }),
        ],
      });

      alice.emit("game:action", { gameId, type: "play", playerId: "PID-a", cardIndex: 0 });
      const [vaultPrompt] = await once(alice, "game:prompt");
      if (vaultPrompt.kind !== "vault-choice") {
        throw new Error("expected a vault-choice prompt");
      }

      const room = rooms.getRoom(gameId);
      if (!room?.pendingVault) {
        throw new Error("expected a pending vault");
      }
      room.pendingVault.offers = [
        CARDS.find((card) => card.id === "t3-scrap-shot") ??
          makeCard({ id: "t3-scrap-shot", name: "Scrap Shot I", type: "vault-silver" }),
      ];

      alice.emit("game:action", {
        gameId,
        type: "vault-choice",
        playerId: "PID-a",
        cardId: "t3-scrap-shot",
      });
      const [targetPrompt] = await once(alice, "game:prompt");
      expect(targetPrompt).toMatchObject({
        gameId,
        kind: "pick-players",
        min: 1,
        max: 1,
      });

      const received: string[] = [];
      const collector = (payload: { gameId: string; message: string }) =>
        received.push(payload.message);
      alice.on("game:log", collector);
      const turnEvent = once(alice, "game:turn");
      const effectEvent = once(alice, "game:effect");
      alice.emit("game:action", {
        gameId,
        type: "choose-targets",
        playerId: "PID-a",
        targetIds: ["PID-b"],
      });
      const [turn] = await turnEvent;
      alice.off("game:log", collector);
      expect(received.some((message) => message.includes("hits Bob"))).toBe(true);
      expect(turn.playerIndex).toBe(1);
      const [effect] = await effectEvent;
      expect(effect.targetNames).toEqual(["Bob"]);

      alice.disconnect();
      bob.disconnect();
    },
  );

  it(
    "prompts pick-cards, reveals hands only to the actor, and completes the play",
    { timeout: 15000 },
    async () => {
      const alice = await connect();
      const bob = await connect();
      const gameId = await setupGame(alice, bob);

      await engineer(rooms.getRoom(gameId), {
        pile: makeCard({ id: "red-5", name: "5", type: "number", color: "red", number: 5 }),
        activeColor: "red",
        currentTurnIndex: 0,
        pendingDraw: 0,
        aliceHand: [
          makeCard({
            id: "vault-silver-token-0",
            name: "Silver Vault",
            type: "vault-silver",
            tags: ["wild"],
          }),
          makeCard({ id: "red-3", name: "3", type: "number", color: "red", number: 3 }),
        ],
      });
      const room = rooms.getRoom(gameId);
      if (room) {
        room.players[1]!.hand = [
          makeCard({ id: "blue-3", name: "3", type: "number", color: "blue", number: 3 }),
        ];
      }

      alice.emit("game:action", { gameId, type: "play", playerId: "PID-a", cardIndex: 0 });
      const [vaultPrompt] = await once(alice, "game:prompt");
      if (vaultPrompt.kind !== "vault-choice") {
        throw new Error("expected a vault-choice prompt");
      }

      const pending = rooms.getRoom(gameId)?.pendingVault;
      if (!pending) {
        throw new Error("expected a pending vault");
      }
      pending.offers = [
        CARDS.find((card) => card.id === "t1-plunder") ??
          makeCard({ id: "t1-plunder", name: "Plunder I", type: "vault-diamond" }),
      ];

      alice.emit("game:action", {
        gameId,
        type: "vault-choice",
        playerId: "PID-a",
        cardId: "t1-plunder",
      });
      const [targetPrompt] = await once(alice, "game:prompt");
      if (targetPrompt.kind !== "pick-players") {
        throw new Error("expected a pick-players prompt");
      }

      alice.emit("game:action", {
        gameId,
        type: "choose-targets",
        playerId: "PID-a",
        targetIds: ["PID-b"],
      });
      const [pickPrompt] = await once(alice, "game:prompt");
      expect(pickPrompt).toMatchObject({
        gameId,
        kind: "pick-cards",
        min: 1,
        max: 3,
        sourcePlayerIds: ["PID-b"],
      });

      const revealedState = once(alice, "game:state");
      alice.emit("game:state:get", { gameId, playerId: "PID-a" });
      const [revealedView] = await revealedState;
      expect(revealedView.revealed).toHaveLength(1);
      const revealedHand = revealedView.revealed![0]!;
      expect(revealedHand).toMatchObject({ playerId: "PID-b" });
      expect(revealedHand.cards.map((card) => card.id)).toContain("blue-3");

      const logEvent = once(alice, "game:log");
      const turnEvent = once(alice, "game:turn");
      const effectEvent = once(alice, "game:effect");
      alice.emit("game:action", {
        gameId,
        type: "choose-cards",
        playerId: "PID-a",
        cardIds: ["blue-3"],
      });
      const [log] = await logEvent;
      expect(log.message).toContain("plays");
      const [turn] = await turnEvent;
      expect(turn.playerIndex).toBe(1);
      const [effect] = await effectEvent;
      expect(effect).toMatchObject({ gameId, cardId: "t1-plunder", playerId: "PID-a" });
      expect(effect.lines.some((line) => line.includes("steals"))).toBe(true);

      const stateA = once(alice, "game:state");
      alice.emit("game:state:get", { gameId, playerId: "PID-a" });
      const [viewA] = await stateA;
      expect(viewA.you.hand).toHaveLength(2);
      expect(viewA.you.hand.map((card) => card.id)).toContain("blue-3");
      expect(viewA.currentTurnIndex).toBe(1);
      assertNoLeaks(viewA);

      const stateB = once(bob, "game:state");
      bob.emit("game:state:get", { gameId, playerId: "PID-b" });
      const [viewB] = await stateB;
      expect(viewB.revealed).toBeUndefined();

      alice.disconnect();
      bob.disconnect();
    },
  );

  it(
    "auto-draws for the current player when the turn timer expires",
    { timeout: 15000 },
    async () => {
      const alice = await connect();
      const bob = await connect();
      const gameId = await setupGame(alice, bob);

      await engineer(rooms.getRoom(gameId), {
        pile: makeCard({ id: "red-5", name: "5", type: "number", color: "red", number: 5 }),
        activeColor: "red",
        currentTurnIndex: 0,
        pendingDraw: 0,
        aliceHand: [
          makeCard({ id: "green-3", name: "3", type: "number", color: "green", number: 3 }),
        ],
      });

      const logEvent = once(alice, "game:log");
      const drawEvent = once(alice, "game:draw");
      const turnEvent = once(alice, "game:turn");
      timers.fireAll();

      const [log] = await logEvent;
      expect(log.message).toContain("draws 1 card");
      const [draw] = await drawEvent;
      expect(draw).toMatchObject({ gameId, playerId: "PID-a", count: 1 });
      const [turn] = await turnEvent;
      expect(turn.playerIndex).toBe(1);

      const stateA = once(alice, "game:state");
      alice.emit("game:state:get", { gameId, playerId: "PID-a" });
      const [viewA] = await stateA;
      expect(viewA.you.hand).toHaveLength(2);
      expect(viewA.currentTurnIndex).toBe(1);

      alice.disconnect();
      bob.disconnect();
    },
  );

  it(
    "draws voluntarily when no card is playable and ends the turn",
    { timeout: 15000 },
    async () => {
      const alice = await connect();
      const bob = await connect();
      const gameId = await setupGame(alice, bob);

      await engineer(rooms.getRoom(gameId), {
        pile: makeCard({ id: "red-5", name: "5", type: "number", color: "red", number: 5 }),
        activeColor: "red",
        currentTurnIndex: 0,
        pendingDraw: 0,
        aliceHand: [
          makeCard({ id: "green-3", name: "3", type: "number", color: "green", number: 3 }),
          makeCard({ id: "blue-4", name: "4", type: "number", color: "blue", number: 4 }),
        ],
      });

      const beforeState = once(alice, "game:state");
      alice.emit("game:state:get", { gameId, playerId: "PID-a" });
      const [viewBefore] = await beforeState;
      expect(viewBefore.you.playable).toEqual([false, false]);

      const logEvent = once(alice, "game:log");
      const turnEvent = once(alice, "game:turn");
      alice.emit("game:action", { gameId, type: "draw", playerId: "PID-a" });

      const [log] = await logEvent;
      expect(log.message).toContain("draws 1 card");
      const [turn] = await turnEvent;
      expect(turn.playerIndex).toBe(1);

      const stateA = once(alice, "game:state");
      alice.emit("game:state:get", { gameId, playerId: "PID-a" });
      const [viewA] = await stateA;
      expect(viewA.you.hand).toHaveLength(3);
      expect(viewA.currentTurnIndex).toBe(1);
      expect(viewA.pendingDraw).toBe(0);
      assertNoLeaks(viewA);

      alice.disconnect();
      bob.disconnect();
    },
  );

  it(
    "emits game:ended with the winner when a player empties their hand",
    { timeout: 15000 },
    async () => {
      const alice = await connect();
      const bob = await connect();
      const gameId = await setupGame(alice, bob);

      await engineer(rooms.getRoom(gameId), {
        pile: makeCard({ id: "red-8", name: "8", type: "number", color: "red", number: 8 }),
        activeColor: "red",
        currentTurnIndex: 0,
        pendingDraw: 0,
        aliceHand: [makeCard({ id: "red-9", name: "9", type: "number", color: "red", number: 9 })],
      });

      const endedEvent = once(alice, "game:ended");
      const stateA = once(alice, "game:state");
      alice.emit("game:action", { gameId, type: "play", playerId: "PID-a", cardIndex: 0 });

      const [ended] = await endedEvent;
      expect(ended.gameId).toBe(gameId);
      expect(ended.winner).toEqual({ id: "PID-a", name: "Alice" });
      expect(ended.reason).toBe("hand_emptied");
      expect(ended.players).toContainEqual({
        id: "PID-a",
        name: "Alice",
        handCount: 0,
        pointsDelta: 0,
        points: null,
        rankName: null,
        icon: null,
        coinsEarned: 0,
      });
      expect(ended.players).toContainEqual({
        id: "PID-b",
        name: "Bob",
        handCount: 8,
        pointsDelta: 0,
        points: null,
        rankName: null,
        icon: null,
        coinsEarned: 0,
      });

      const [viewA] = await stateA;
      expect(viewA.status).toBe("concluding");
      assertNoLeaks(viewA);

      alice.disconnect();
      bob.disconnect();
    },
  );

  it("returns the implemented vault catalog", { timeout: 15000 }, async () => {
    const alice = await connect();
    const catalog = once(alice, "vault:catalog:return");
    alice.emit("vault:catalog:get");
    const [payload] = await catalog;
    expect(payload.implemented.length).toBeGreaterThan(0);
    for (const entry of payload.implemented) {
      expect(entry.id).toMatch(/^t[1-3]-/);
      expect(["vault-silver", "vault-gold", "vault-diamond"]).toContain(entry.type);
      expect(entry.name.length).toBeGreaterThan(0);
      expect(entry.effect.length).toBeGreaterThan(0);
    }
    const silver = payload.implemented.filter((e) => e.type === "vault-silver");
    const gold = payload.implemented.filter((e) => e.type === "vault-gold");
    const diamond = payload.implemented.filter((e) => e.type === "vault-diamond");
    expect(silver.length).toBeGreaterThan(0);
    expect(gold.length).toBeGreaterThan(0);
    expect(diamond.length).toBeGreaterThan(0);
    alice.disconnect();
  });

  it("returns an empty leaderboard when Firestore is unavailable", { timeout: 15000 }, async () => {
    const alice = await connect();
    const leaderboard = once(alice, "leaderboard:return");
    alice.emit("leaderboard:get");
    const [payload] = await leaderboard;
    expect(payload.players).toEqual([]);
    alice.disconnect();
  });

  it(
    "rejoins a disconnected player and restores their game state",
    { timeout: 15000 },
    async () => {
      const alice = await connect();
      const bob = await connect();
      const gameId = await setupGame(alice, bob);

      // Get initial state
      const stateA = once(alice, "game:state");
      alice.emit("game:state:get", { gameId, playerId: "PID-a" });
      const [viewA] = await stateA;
      expect(viewA.connected).toBe(true);
      expect(viewA.you.hand).toHaveLength(8);
      assertNoLeaks(viewA);

      // Simulate disconnect
      alice.disconnect();

      // Reconnect with a new socket
      const carol = await connect();
      const rejoinState = once(carol, "game:state");
      carol.emit("game:rejoin", { gameId, playerId: "PID-a" });
      const [rejoinedView] = await rejoinState;
      expect(rejoinedView.connected).toBe(true);
      expect(rejoinedView.you.hand).toHaveLength(8);
      assertNoLeaks(rejoinedView);

      bob.disconnect();
      carol.disconnect();
    },
  );

  it("rejects game:rejoin with invalid payload", { timeout: 15000 }, async () => {
    const alice = await connect();
    const err = once(alice, "error");
    alice.emit("game:rejoin", { gameId: "", playerId: "" });
    const [payload] = await err;
    expect(payload.code).toBe("INVALID_REJOIN");
    alice.disconnect();
  });
});
