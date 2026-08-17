import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Card, Color } from "@bruno/shared";
import { CARDS, isVaultTokenCard } from "@bruno/shared";
import { RoomManager, type RoomEvent, type RoomResult } from "./room-manager.js";
import { TurnManager } from "./turn-manager.js";

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
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

function vaultToken(): Card {
  return makeCard({
    id: "vault-silver-token-0",
    name: "Silver Vault",
    type: "vault-silver",
    tags: ["wild"],
    effect: "Play: choose one of 5 random Silver Vault effects.",
  });
}

function seededVault(
  manager: RoomManager,
  room: import("./room.js").Room,
  offerId: string,
  targetSpec?: { min: number; max: number; allowSelf?: boolean },
): void {
  room.pendingVault = {
    cardIndex: 0,
    playerId: "p1",
    tier: "vault-silver",
    offers: [CARDS.find((card) => card.id === offerId)!],
    chosenCardId: offerId,
    targetSpec,
  };
}

function createManager(events: RoomEvent[] = []): RoomManager {
  return new RoomManager({
    eventSink: (event) => events.push(event),
    turnManager: new TurnManager(5000, () => ({ cancel: () => {} })),
  });
}

function value<T>(result: RoomResult<T>): T {
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.value;
}

describe("RoomManager", () => {
  it("creates a room with the host seated", () => {
    const manager = createManager();
    const room = value(
      manager.createRoom({ name: "Test", playerId: "p1", playerName: "Alice", maxPlayers: 8 }),
    );
    expect(room.status).toBe("prepping");
    expect(room.hostId).toBe("p1");
    expect(room.playerCount).toBe(1);
    expect(room.players[0]).toMatchObject({ id: "p1", name: "Alice", isHost: true });
  });

  it("rejects a room sized below the 3-player minimum", () => {
    const manager = createManager();
    const attempt = manager.createRoom({
      name: "A",
      playerId: "p1",
      playerName: "A",
      maxPlayers: 2,
    });
    if (attempt.ok) {
      throw new Error("expected undersized room to fail");
    }
    expect(attempt.error).toBe("INVALID_MAX_PLAYERS");
  });

  it("lists only prepping rooms with maxPlayers", () => {
    const manager = createManager();
    const room = value(
      manager.createRoom({ name: "A", playerId: "p1", playerName: "A", maxPlayers: 6 }),
    );
    expect(manager.listRooms()).toEqual([
      { id: room.id, name: "A", playerCount: 1, maxPlayers: 6 },
    ]);
    value(manager.startGame(room.id, "p1", seeded(1)));
    expect(manager.listRooms()).toEqual([]);
  });

  it("joins a room and bumps the player count", () => {
    const manager = createManager();
    const room = value(
      manager.createRoom({ name: "A", playerId: "p1", playerName: "A", maxPlayers: 8 }),
    );
    value(manager.joinRoom(room.id, "p2", "B"));
    expect(room.playerCount).toBe(2);
    expect(room.getPlayer("p2")).toMatchObject({ name: "B", isHost: false });
  });

  it("treats a duplicate join as idempotent (no duplicate player)", () => {
    const manager = createManager();
    const room = value(
      manager.createRoom({ name: "A", playerId: "p1", playerName: "A", maxPlayers: 8 }),
    );
    const dup = value(manager.joinRoom(room.id, "p1", "A"));
    expect(dup.id).toBe(room.id);
    expect(room.playerCount).toBe(1);
  });

  it("rejects join when the room is full", () => {
    const manager = createManager();
    const room = value(
      manager.createRoom({ name: "A", playerId: "p1", playerName: "A", maxPlayers: 3 }),
    );
    value(manager.joinRoom(room.id, "p2", "B"));
    value(manager.joinRoom(room.id, "p3", "C"));
    const full = manager.joinRoom(room.id, "p4", "D");
    if (full.ok) {
      throw new Error("expected full room join to fail");
    }
    expect(full.error).toBe("ROOM_FULL");
  });

  it("rejects join once the game has started", () => {
    const manager = createManager();
    const room = value(
      manager.createRoom({ name: "A", playerId: "p1", playerName: "A", maxPlayers: 8 }),
    );
    value(manager.startGame(room.id, "p1", seeded(2)));
    const late = manager.joinRoom(room.id, "p2", "B");
    if (late.ok) {
      throw new Error("expected late join to fail");
    }
    expect(late.error).toBe("GAME_STARTED");
  });

  it("rejects a second start on an already-started room", () => {
    const manager = createManager();
    const room = value(
      manager.createRoom({ name: "A", playerId: "p1", playerName: "A", maxPlayers: 3 }),
    );
    value(manager.joinRoom(room.id, "p2", "B"));
    value(manager.startGame(room.id, "p1", seeded(9)));
    const second = manager.startGame(room.id, "p1", seeded(9));
    if (second.ok) {
      throw new Error("expected double start to fail");
    }
    expect(second.error).toBe("GAME_STARTED");
  });

  it("promotes the next player when the host leaves", () => {
    const manager = createManager();
    const room = value(
      manager.createRoom({ name: "A", playerId: "p1", playerName: "A", maxPlayers: 4 }),
    );
    value(manager.joinRoom(room.id, "p2", "B"));
    value(manager.leaveRoom(room.id, "p1"));
    const updated = manager.getRoom(room.id);
    expect(updated?.hostId).toBe("p2");
    expect(updated?.players[0]?.isHost).toBe(true);
  });

  it("deletes the room when the last player leaves", () => {
    const manager = createManager();
    const room = value(
      manager.createRoom({ name: "A", playerId: "p1", playerName: "A", maxPlayers: 4 }),
    );
    value(manager.leaveRoom(room.id, "p1"));
    expect(manager.getRoom(room.id)).toBeNull();
  });

  it("drops the current player's open prompt when they leave", () => {
    const manager = createManager();
    const room = value(
      manager.createRoom({ name: "A", playerId: "p1", playerName: "A", maxPlayers: 4 }),
    );
    value(manager.joinRoom(room.id, "p2", "B"));
    value(manager.startGame(room.id, "p1", seeded(7)));
    room.currentTurnIndex = 0;
    room.pile = [makeCard({ id: "red-5", name: "5", type: "number", color: "red", number: 5 })];
    room.activeColor = "red";
    room.pendingDraw = 0;
    room.pendingWild = { cardIndex: 0, playerId: "p1" };
    room.pendingVault = { cardIndex: 0, playerId: "p1", tier: "vault-silver", offers: [] };
    room.players[1]!.hand = [
      makeCard({ id: "red-7", name: "7", type: "number", color: "red", number: 7 }),
    ];

    value(manager.leaveRoom(room.id, "p1"));

    expect(room.pendingWild).toBeUndefined();
    expect(room.pendingVault).toBeUndefined();
    expect(room.currentTurnIndex).toBe(0);
    const play = manager.performAction(room.id, "p2", {
      gameId: room.id,
      type: "play",
      playerId: "p2",
      cardIndex: 0,
    });
    expect(play.ok).toBe(true);
  });

  it("allows a solo start (preview) and deals base hand cards", () => {
    const manager = createManager();
    const room = value(
      manager.createRoom({ name: "A", playerId: "p1", playerName: "A", maxPlayers: 8 }),
    );
    value(manager.startGame(room.id, "p1", seeded(11)));
    expect(room.status).toBe("ongoing");
    expect(room.players[0]?.hand.length).toBeGreaterThanOrEqual(8);
    expect(room.pile).toHaveLength(1);
    expect(room.deck).toHaveLength(115 - (room.players[0]?.hand.length ?? 8) - 1);
    expect(room.currentTurnIndex).toBe(0);
    expect(room.currentDirection).toBe(1);
  });

  it("applies location, origin, and mayhem effects at game start", () => {
    const events: RoomEvent[] = [];
    const manager = new RoomManager({
      eventSink: (event) => events.push(event),
      turnManager: new TurnManager(5000, () => ({ cancel: () => {} })),
    });
    const room = value(
      manager.createRoom({ name: "A", playerId: "p1", playerName: "A", maxPlayers: 3 }),
    );
    value(manager.joinRoom(room.id, "p2", "B"));
    value(manager.joinRoom(room.id, "p3", "C"));

    value(manager.startGame(room.id, "p1", seeded(9), { locationId: "loc-hell-gate" }));

    expect(room.locationId).toBeDefined();
    expect(room.mayhemEventId).toBeDefined();
    expect(room.players.every((player) => player.originId)).toBe(true);
    expect(
      events.some((event) => event.type === "log" && event.message.includes("Location:")),
    ).toBe(true);
    expect(
      events.some((event) => event.type === "log" && event.message.includes("Mayhem begins:")),
    ).toBe(true);
    expect(
      events.some((event) => event.type === "log" && event.message.includes("begins as")),
    ).toBe(true);
  });

  it("records the starting Mayhem event in usedMayhemIds", () => {
    const manager = createManager();
    const room = value(
      manager.createRoom({ name: "A", playerId: "p1", playerName: "A", maxPlayers: 3 }),
    );
    value(manager.joinRoom(room.id, "p2", "B"));
    value(
      manager.startGame(room.id, "p1", seeded(9), {
        locationId: "loc-hell-gate",
        mayhemEventId: "mayhem-3",
      }),
    );
    expect(room.mayhemEventId).toBe("mayhem-3");
    expect(room.usedMayhemIds).toEqual(["mayhem-3"]);
  });

  it("does not roll Mayhem without the Hell Gate location", () => {
    const manager = createManager();
    const room = value(
      manager.createRoom({ name: "A", playerId: "p1", playerName: "A", maxPlayers: 3 }),
    );
    value(manager.joinRoom(room.id, "p2", "B"));
    value(
      manager.startGame(room.id, "p1", seeded(9), {
        locationId: "loc-ocean",
        mayhemEventId: "mayhem-3",
      }),
    );
    expect(room.mayhemEventId).toBeUndefined();
    expect(room.usedMayhemIds).toEqual([]);
  });

  it("rejects a non-host start", () => {
    const manager = createManager();
    const room = value(
      manager.createRoom({ name: "A", playerId: "p1", playerName: "A", maxPlayers: 8 }),
    );
    value(manager.joinRoom(room.id, "p2", "B"));
    const attempt = manager.startGame(room.id, "p2", seeded(3));
    if (attempt.ok) {
      throw new Error("expected non-host start to fail");
    }
    expect(attempt.error).toBe("NOT_HOST");
  });

  it("rejects start until minPlayers are seated", () => {
    const manager = new RoomManager({
      minPlayers: 3,
      turnManager: new TurnManager(5000, () => ({ cancel: () => {} })),
    });
    const room = value(
      manager.createRoom({ name: "A", playerId: "p1", playerName: "A", maxPlayers: 4 }),
    );
    value(manager.joinRoom(room.id, "p2", "B"));
    const attempt = manager.startGame(room.id, "p1", seeded(1));
    if (attempt.ok) {
      throw new Error("expected start with too few players to fail");
    }
    expect(attempt.error).toBe("NEED_MORE_PLAYERS");
    value(manager.joinRoom(room.id, "p3", "C"));
    expect(value(manager.startGame(room.id, "p1", seeded(2))).status).toBe("ongoing");
  });

  it("derives a PlayerView with only the actor's hand and only the pile top", () => {
    const manager = createManager();
    const room = value(
      manager.createRoom({ name: "A", playerId: "p1", playerName: "A", maxPlayers: 8 }),
    );
    value(manager.joinRoom(room.id, "p2", "B"));
    value(manager.joinRoom(room.id, "p3", "C"));
    value(
      manager.startGame(room.id, "p1", seeded(9), {
        locationId: null,
        mayhemEventId: null,
        originId: null,
      }),
    );

    const view = value(manager.getPlayerView(room.id, "p1"));
    expect(view.playerCount).toBe(3);
    expect(view.you.index).toBe(0);
    expect(view.you.hand.length).toBe(8);
    for (const card of view.you.hand) {
      expect(card).toHaveProperty("id");
      expect(card).toHaveProperty("type");
    }
    expect(view.pileTop).not.toBeNull();
    expect(view.deckCount).toBe(115 - view.you.hand.length - (3 - 1) * 8 - 1);

    const serialized = JSON.stringify(view);
    expect(serialized).not.toContain('"pile":');
    for (const player of view.players) {
      expect(Object.keys(player)).toEqual(
        expect.arrayContaining(["id", "name", "isHost", "isTurn", "handCount"]),
      );
      expect(Object.keys(player)).not.toContain("hand");
      expect(player.handCount).toBe(8);
    }
  });

  it("surfaces the turn duration in seconds", () => {
    const events: RoomEvent[] = [];
    const manager = new RoomManager({
      eventSink: (event) => events.push(event),
      turnManager: new TurnManager(3500, () => ({ cancel: () => {} })),
    });
    const room = value(
      manager.createRoom({ name: "A", playerId: "p1", playerName: "A", maxPlayers: 8 }),
    );
    value(manager.startGame(room.id, "p1", seeded(11)));
    const view = value(manager.getPlayerView(room.id, "p1"));
    expect(view.turnDuration).toBe(3.5);
  });

  it("prompts the actor to choose a color when a +4 is played without one", () => {
    const events: RoomEvent[] = [];
    const manager = createManager(events);
    const room = value(
      manager.createRoom({ name: "A", playerId: "p1", playerName: "A", maxPlayers: 8 }),
    );
    value(manager.joinRoom(room.id, "p2", "B"));
    value(manager.startGame(room.id, "p1", seeded(9)));
    room.pile = [makeCard({ id: "red-5", name: "5", type: "number", color: "red", number: 5 })];
    room.activeColor = "red";
    room.pendingDraw = 0;
    room.currentTurnIndex = 0;
    room.players[0]!.hand = [makeCard({ id: "d4", name: "Draw 4", type: "draw4", tags: ["wild"] })];

    const result = manager.performAction(room.id, "p1", {
      gameId: room.id,
      type: "play",
      playerId: "p1",
      cardIndex: 0,
    });
    expect(result.ok).toBe(true);
    expect(events).toContainEqual({
      type: "prompt",
      gameId: room.id,
      playerId: "p1",
      kind: "choose-color",
    });
    expect(room.pendingWild).toEqual({ cardIndex: 0, playerId: "p1" });
    expect(room.players[0]!.hand).toHaveLength(1);
    expect(events.filter((event) => event.type === "turn")).toHaveLength(1);
  });

  it("completes a pending +4 once the color is chosen", () => {
    const events: RoomEvent[] = [];
    const manager = createManager(events);
    const room = value(
      manager.createRoom({ name: "A", playerId: "p1", playerName: "A", maxPlayers: 8 }),
    );
    value(manager.joinRoom(room.id, "p2", "B"));
    value(manager.startGame(room.id, "p1", seeded(9)));
    room.pile = [makeCard({ id: "red-5", name: "5", type: "number", color: "red", number: 5 })];
    room.activeColor = "red";
    room.pendingDraw = 0;
    room.currentTurnIndex = 0;
    room.players[0]!.hand = [
      makeCard({ id: "d4", name: "Draw 4", type: "draw4", tags: ["wild"] }),
      makeCard({ id: "red-3", name: "3", type: "number", color: "red", number: 3 }),
    ];
    value(
      manager.performAction(room.id, "p1", {
        gameId: room.id,
        type: "play",
        playerId: "p1",
        cardIndex: 0,
      }),
    );

    const result = manager.performAction(room.id, "p1", {
      gameId: room.id,
      type: "choose-color",
      playerId: "p1",
      chosenColor: "green",
    });
    expect(result.ok).toBe(true);
    expect(room.players[0]!.hand).toEqual([expect.objectContaining({ id: "red-3" })]);
    expect(room.pile[room.pile.length - 1]).toMatchObject({ id: "d4" });
    expect(room.activeColor).toBe("green");
    expect(room.pendingDraw).toBe(4);
    expect(room.pendingWild).toBeUndefined();
    expect(room.currentTurnIndex).toBe(1);
    expect(events.some((event) => event.type === "log" && event.message.includes("+4"))).toBe(true);
  });

  it("rejects choose-color when nothing is pending", () => {
    const manager = createManager();
    const room = value(
      manager.createRoom({ name: "A", playerId: "p1", playerName: "A", maxPlayers: 8 }),
    );
    value(manager.joinRoom(room.id, "p2", "B"));
    value(manager.startGame(room.id, "p1", seeded(9)));
    room.currentTurnIndex = 0;
    const result = manager.performAction(room.id, "p1", {
      gameId: room.id,
      type: "choose-color",
      playerId: "p1",
      chosenColor: "green",
    });
    if (result.ok) {
      throw new Error("expected choose-color without a pending wild to fail");
    }
    expect(result.error).toBe("INVALID_ACTION");
  });

  it("applies the most-common hand color when choose-color times out", () => {
    const events: RoomEvent[] = [];
    const timers: Array<() => void> = [];
    const manager = new RoomManager({
      eventSink: (event) => events.push(event),
      turnManager: new TurnManager(5000, (callback) => {
        timers.push(callback);
        return { cancel: () => {} };
      }),
    });
    const room = value(
      manager.createRoom({ name: "A", playerId: "p1", playerName: "A", maxPlayers: 8 }),
    );
    value(manager.joinRoom(room.id, "p2", "B"));
    value(manager.startGame(room.id, "p1", seeded(9)));
    room.pile = [makeCard({ id: "red-5", name: "5", type: "number", color: "red", number: 5 })];
    room.activeColor = "red";
    room.pendingDraw = 0;
    room.currentTurnIndex = 0;
    room.players[0]!.hand = [
      makeCard({ id: "red-1", name: "1", type: "number", color: "red", number: 1 }),
      makeCard({ id: "red-2", name: "2", type: "number", color: "red", number: 2 }),
      makeCard({ id: "blue-3", name: "3", type: "number", color: "blue", number: 3 }),
      makeCard({ id: "d4", name: "Draw 4", type: "draw4", tags: ["wild"] }),
    ];
    value(
      manager.performAction(room.id, "p1", {
        gameId: room.id,
        type: "play",
        playerId: "p1",
        cardIndex: 3,
      }),
    );
    expect(room.pendingWild).toBeDefined();
    // prompt-open resets the turn timer (fresh window)
    expect(timers).toHaveLength(2);

    timers.pop()!();

    expect(room.pendingWild).toBeUndefined();
    expect(room.players[0]!.hand).toHaveLength(3);
    expect(room.pendingDraw).toBe(4);
    expect(room.activeColor).toBe("red");
    expect(room.currentTurnIndex).toBe(1);
    expect(
      events.some((event) => event.type === "log" && event.message.includes("defaulting")),
    ).toBe(true);
  });

  it("auto-picks the first vault offer when vault-choice times out", () => {
    const events: RoomEvent[] = [];
    const timers: Array<() => void> = [];
    const manager = new RoomManager({
      eventSink: (event) => events.push(event),
      turnManager: new TurnManager(5000, (callback) => {
        timers.push(callback);
        return { cancel: () => {} };
      }),
    });
    const room = value(
      manager.createRoom({ name: "A", playerId: "p1", playerName: "A", maxPlayers: 8 }),
    );
    value(manager.joinRoom(room.id, "p2", "B"));
    value(manager.startGame(room.id, "p1", seeded(9)));
    room.pendingDraw = 0;
    room.currentTurnIndex = 0;
    room.activeColor = "red";
    room.players[0]!.hand = [vaultToken()];
    room.pendingVault = {
      cardIndex: 0,
      playerId: "p1",
      tier: "vault-silver",
      offers: [
        CARDS.find((card) => card.id === "t3-scrap-shot")!,
        CARDS.find((card) => card.id === "t3-mitosis")!,
      ],
    };

    timers[0]!();

    expect(room.pendingVault).toBeUndefined();
    expect(room.pile[room.pile.length - 1]).toMatchObject({ id: "vault-silver-token-0" });
    // first offer resolves against the default target (first seated non-actor)
    expect(
      events.some((event) => event.type === "log" && event.message.includes("Scrap Shot")),
    ).toBe(true);
    expect(
      events.some(
        (event) => event.type === "log" && event.message.includes("hits B: +1 and discards"),
      ),
    ).toBe(true);
    const effectEvents = events.filter((event) => event.type === "effect");
    expect(effectEvents).toHaveLength(1);
    const effectEvent = effectEvents[0];
    expect(effectEvent).toMatchObject({
      type: "effect",
      gameId: room.id,
      playerId: "p1",
      playerName: "A",
      cardId: "t3-scrap-shot",
      tier: "vault-silver",
    });
    if (!effectEvent || effectEvent.type !== "effect") {
      throw new Error("expected an effect event");
    }
    expect(effectEvent.lines.length).toBeGreaterThan(0);
    expect(room.currentTurnIndex).toBe(1);
  });

  it("keeps the vault prompt open when the defaulted offer is unaffordable (t2-ruin)", () => {
    const events: RoomEvent[] = [];
    const timers: Array<() => void> = [];
    const manager = new RoomManager({
      eventSink: (event) => events.push(event),
      turnManager: new TurnManager(5000, (callback) => {
        timers.push(callback);
        return { cancel: () => {} };
      }),
    });
    const room = value(
      manager.createRoom({ name: "A", playerId: "p1", playerName: "A", maxPlayers: 8 }),
    );
    value(manager.joinRoom(room.id, "p2", "B"));
    value(manager.startGame(room.id, "p1", seeded(9)));
    room.pendingDraw = 0;
    room.currentTurnIndex = 0;
    room.activeColor = "red";
    room.players[0]!.hand = [vaultToken()];
    room.pendingVault = {
      cardIndex: 0,
      playerId: "p1",
      tier: "vault-silver",
      offers: [CARDS.find((card) => card.id === "t2-ruin")!],
    };

    timers[0]!();

    expect(room.pendingVault).toBeDefined();
    expect(room.pendingVault?.chosenCardId).toBeUndefined();
    expect(room.pile.some((card) => card.id === "vault-silver-token-0")).toBe(false);
    expect(events).toContainEqual({
      type: "alert",
      gameId: room.id,
      playerId: "p1",
      message: "You need 5 red cards to play Ruin.",
    });
    expect(events.some((event) => event.type === "prompt" && event.kind === "vault-choice")).toBe(
      true,
    );
    expect(timers.length).toBe(2);
  });

  it("auto-fills default targets when pick-players times out", () => {
    const events: RoomEvent[] = [];
    const timers: Array<() => void> = [];
    const manager = new RoomManager({
      eventSink: (event) => events.push(event),
      turnManager: new TurnManager(5000, (callback) => {
        timers.push(callback);
        return { cancel: () => {} };
      }),
    });
    const room = value(
      manager.createRoom({ name: "A", playerId: "p1", playerName: "A", maxPlayers: 8 }),
    );
    value(manager.joinRoom(room.id, "p2", "B"));
    value(manager.joinRoom(room.id, "p3", "C"));
    value(manager.joinRoom(room.id, "p4", "D"));
    value(manager.startGame(room.id, "p1", seeded(9)));
    room.pendingDraw = 0;
    room.currentTurnIndex = 0;
    room.activeColor = "red";
    room.players[0]!.hand = [vaultToken()];
    for (let i = 1; i <= 3; i += 1) {
      room.players[i]!.hand = [
        makeCard({ id: "vault-silver-token-1", name: "Silver Vault", type: "vault-silver" }),
        makeCard({ id: "vault-silver-token-2", name: "Silver Vault", type: "vault-silver" }),
      ];
    }
    room.pendingVault = {
      cardIndex: 0,
      playerId: "p1",
      tier: "vault-silver",
      offers: [CARDS.find((card) => card.id === "t2-vault-hunter")!],
      chosenCardId: "t2-vault-hunter",
      targetSpec: { min: 1, max: 3 },
    };

    timers[0]!();

    expect(room.pendingVault).toBeUndefined();
    expect(
      events.some(
        (event) => event.type === "log" && event.message.includes("steals 2 vault token(s)"),
      ),
    ).toBe(true);
    expect(room.players[0]!.hand.filter(isVaultTokenCard)).toHaveLength(2);
    expect(room.currentTurnIndex).toBe(1);
  });

  it("derives a playable mask matching the legal-move rule", () => {
    const manager = createManager();
    const room = value(
      manager.createRoom({ name: "A", playerId: "p1", playerName: "A", maxPlayers: 8 }),
    );
    value(manager.joinRoom(room.id, "p2", "B"));
    value(manager.startGame(room.id, "p1", seeded(9)));
    room.pile = [makeCard({ id: "red-5", name: "5", type: "number", color: "red", number: 5 })];
    room.activeColor = "red";
    room.pendingDraw = 0;
    room.currentTurnIndex = 0;
    room.players[0]!.hand = [
      makeCard({ id: "red-7", name: "7", type: "number", color: "red", number: 7 }),
      makeCard({ id: "blue-3", name: "3", type: "number", color: "blue", number: 3 }),
      makeCard({ id: "green-5", name: "5", type: "number", color: "green", number: 5 }),
      makeCard({ id: "d4", name: "Draw 4", type: "draw4", tags: ["wild"] }),
    ];

    const view = value(manager.getPlayerView(room.id, "p1"));
    expect(view.you.playable).toEqual([true, false, true, true]);
  });

  it("allows a draw that eats the pending stack while holding a +2", () => {
    const events: RoomEvent[] = [];
    const manager = createManager(events);
    const room = value(
      manager.createRoom({ name: "A", playerId: "p1", playerName: "A", maxPlayers: 8 }),
    );
    value(manager.joinRoom(room.id, "p2", "B"));
    value(manager.startGame(room.id, "p1", seeded(9)));
    room.pile = [makeCard({ id: "red-5", name: "5", type: "number", color: "red", number: 5 })];
    room.activeColor = "red";
    room.pendingDraw = 6;
    room.currentTurnIndex = 0;
    room.players[0]!.hand = [
      makeCard({ id: "green-d2", name: "Draw 2", type: "draw2", color: "green" }),
      makeCard({ id: "red-3", name: "3", type: "number", color: "red", number: 3 }),
    ];

    const result = manager.performAction(room.id, "p1", {
      gameId: room.id,
      type: "draw",
      playerId: "p1",
    });
    if (!result.ok) {
      throw new Error(result.error);
    }
    expect(room.players[0]!.hand).toHaveLength(8);
    expect(room.pendingDraw).toBe(0);
    expect(room.currentTurnIndex).toBe(1);
    expect(events.some((event) => event.type === "log" && event.message.includes("draws 6"))).toBe(
      true,
    );
  });

  it("rejects a draw while a color is pending", () => {
    const manager = createManager();
    const room = value(
      manager.createRoom({ name: "A", playerId: "p1", playerName: "A", maxPlayers: 8 }),
    );
    value(manager.joinRoom(room.id, "p2", "B"));
    value(manager.startGame(room.id, "p1", seeded(9)));
    room.pendingWild = { cardIndex: 0, playerId: "p1" };
    room.currentTurnIndex = 0;

    const result = manager.performAction(room.id, "p1", {
      gameId: room.id,
      type: "draw",
      playerId: "p1",
    });
    if (result.ok) {
      throw new Error("expected a DRAW_NOT_ALLOWED failure");
    }
    expect(result.error).toBe("DRAW_NOT_ALLOWED");
  });
});

describe("vault target picking", () => {
  function setupTargetGame(manager: RoomManager, players: number): import("./room.js").Room {
    const room = value(
      manager.createRoom({ name: "A", playerId: "p1", playerName: "A", maxPlayers: 8 }),
    );
    for (let i = 2; i <= players; i += 1) {
      value(manager.joinRoom(room.id, `p${i}`, `P${i}`));
    }
    value(manager.startGame(room.id, "p1", seeded(9)));
    room.pile = [makeCard({ id: "red-5", name: "5", type: "number", color: "red", number: 5 })];
    room.activeColor = "red";
    room.pendingDraw = 0;
    room.currentTurnIndex = 0;
    room.players[0]!.hand = [vaultToken()];
    return room;
  }

  it("prompts pick-players after choosing a target-taking vault effect", () => {
    const events: RoomEvent[] = [];
    const manager = createManager(events);
    const room = setupTargetGame(manager, 3);

    seededVault(manager, room, "t3-scrap-shot", { min: 1, max: 1 });
    const result = manager.performAction(room.id, "p1", {
      gameId: room.id,
      type: "vault-choice",
      playerId: "p1",
      cardId: "t3-scrap-shot",
    });
    expect(result.ok).toBe(true);
    expect(room.pendingVault).toBeDefined();
    expect(room.currentTurnIndex).toBe(0);
    expect(events).toContainEqual({
      type: "prompt",
      gameId: room.id,
      playerId: "p1",
      kind: "pick-players",
      min: 1,
      max: 1,
    });
  });

  it("completes the play once targets are chosen (t3-scrap-shot)", () => {
    const events: RoomEvent[] = [];
    const manager = createManager(events);
    const room = setupTargetGame(manager, 3);
    room.players[1]!.hand = [
      makeCard({ id: "blue-3", name: "3", type: "number", color: "blue", number: 3 }),
    ];
    const deckBefore = room.deck.length;

    seededVault(manager, room, "t3-scrap-shot", { min: 1, max: 1 });
    value(
      manager.performAction(room.id, "p1", {
        gameId: room.id,
        type: "vault-choice",
        playerId: "p1",
        cardId: "t3-scrap-shot",
      }),
    );

    const result = manager.performAction(room.id, "p1", {
      gameId: room.id,
      type: "choose-targets",
      playerId: "p1",
      targetIds: ["p2"],
    });
    if (!result.ok) {
      throw new Error(result.error);
    }
    expect(room.pendingVault).toBeUndefined();
    expect(room.players[0]!.hand).toHaveLength(0);
    expect(room.players[1]!.hand).toHaveLength(1);
    expect(room.deck).toHaveLength(deckBefore - 1);
    expect(room.currentTurnIndex).toBe(1);
    expect(events.some((event) => event.type === "log" && event.message.includes("hits P2"))).toBe(
      true,
    );
  });

  it("accepts 1-3 targets for vault-hunter and steals 2 vaults in total", () => {
    const manager = createManager();
    const room = setupTargetGame(manager, 4);
    for (const index of [1, 2, 3]) {
      room.players[index]!.hand = [
        vaultToken(),
        vaultToken(),
        makeCard({ id: "red-7", name: "7", type: "number", color: "red", number: 7 }),
      ];
    }

    seededVault(manager, room, "t2-vault-hunter", { min: 1, max: 3 });
    const tooMany = manager.performAction(room.id, "p1", {
      gameId: room.id,
      type: "choose-targets",
      playerId: "p1",
      targetIds: ["p2", "p3", "p4", "p1"],
    });
    if (tooMany.ok) {
      throw new Error("expected too-many targets to fail");
    }
    expect(tooMany.error).toBe("INVALID_ACTION");

    const result = manager.performAction(room.id, "p1", {
      gameId: room.id,
      type: "choose-targets",
      playerId: "p1",
      targetIds: ["p2", "p3"],
    });
    if (!result.ok) {
      throw new Error(result.error);
    }
    expect(room.pendingVault).toBeUndefined();
    expect(room.players[0]!.hand.filter((card) => card.type === "vault-silver")).toHaveLength(2);
  });

  it("rejects choose-targets when no vault is pending", () => {
    const manager = createManager();
    const room = setupTargetGame(manager, 3);

    const result = manager.performAction(room.id, "p1", {
      gameId: room.id,
      type: "choose-targets",
      playerId: "p1",
      targetIds: ["p2"],
    });
    if (result.ok) {
      throw new Error("expected choose-targets without a pending vault to fail");
    }
    expect(result.error).toBe("INVALID_ACTION");
  });

  it("rejects choose-targets when the chosen card takes no targets", () => {
    const manager = createManager();
    const room = setupTargetGame(manager, 3);

    seededVault(manager, room, "t1-meiosis");
    const result = manager.performAction(room.id, "p1", {
      gameId: room.id,
      type: "choose-targets",
      playerId: "p1",
      targetIds: ["p2"],
    });
    if (result.ok) {
      throw new Error("expected choose-targets for a no-target card to fail");
    }
    expect(result.error).toBe("INVALID_ACTION");
  });

  it("rejects choose-targets that include the actor", () => {
    const manager = createManager();
    const room = setupTargetGame(manager, 3);

    seededVault(manager, room, "t3-scrap-shot", { min: 1, max: 1 });
    value(
      manager.performAction(room.id, "p1", {
        gameId: room.id,
        type: "vault-choice",
        playerId: "p1",
        cardId: "t3-scrap-shot",
      }),
    );
    const result = manager.performAction(room.id, "p1", {
      gameId: room.id,
      type: "choose-targets",
      playerId: "p1",
      targetIds: ["p1"],
    });
    if (result.ok) {
      throw new Error("expected self-targeting to fail");
    }
    expect(result.error).toBe("INVALID_ACTION");
  });

  it("rejects choose-targets that include a non-seated player", () => {
    const manager = createManager();
    const room = setupTargetGame(manager, 3);

    seededVault(manager, room, "t3-scrap-shot", { min: 1, max: 1 });
    value(
      manager.performAction(room.id, "p1", {
        gameId: room.id,
        type: "vault-choice",
        playerId: "p1",
        cardId: "t3-scrap-shot",
      }),
    );
    const result = manager.performAction(room.id, "p1", {
      gameId: room.id,
      type: "choose-targets",
      playerId: "p1",
      targetIds: ["p2", "ghost"],
    });
    if (result.ok) {
      throw new Error("expected a ghost target to fail");
    }
    expect(result.error).toBe("INVALID_ACTION");
  });

  it("rejects choose-targets with duplicate ids", () => {
    const manager = createManager();
    const room = setupTargetGame(manager, 3);

    seededVault(manager, room, "t2-vault-hunter", { min: 1, max: 3 });
    value(
      manager.performAction(room.id, "p1", {
        gameId: room.id,
        type: "vault-choice",
        playerId: "p1",
        cardId: "t2-vault-hunter",
      }),
    );
    const result = manager.performAction(room.id, "p1", {
      gameId: room.id,
      type: "choose-targets",
      playerId: "p1",
      targetIds: ["p2", "p2", "p3"],
    });
    if (result.ok) {
      throw new Error("expected duplicate targets to fail");
    }
    expect(result.error).toBe("INVALID_ACTION");
  });

  it("rejects play and draw while target picking is pending", () => {
    const manager = createManager();
    const room = setupTargetGame(manager, 3);

    seededVault(manager, room, "t3-scrap-shot", { min: 1, max: 1 });
    value(
      manager.performAction(room.id, "p1", {
        gameId: room.id,
        type: "vault-choice",
        playerId: "p1",
        cardId: "t3-scrap-shot",
      }),
    );

    const play = manager.performAction(room.id, "p1", {
      gameId: room.id,
      type: "play",
      playerId: "p1",
      cardIndex: 0,
    });
    if (play.ok) {
      throw new Error("expected a play while picking targets to fail");
    }
    expect(play.error).toBe("INVALID_ACTION");

    const draw = manager.performAction(room.id, "p1", {
      gameId: room.id,
      type: "draw",
      playerId: "p1",
    });
    if (draw.ok) {
      throw new Error("expected a draw while picking targets to fail");
    }
    expect(draw.error).toBe("DRAW_NOT_ALLOWED");
  });
});

describe("vault card picking", () => {
  function setupCardGame(manager: RoomManager, players: number): import("./room.js").Room {
    const room = value(
      manager.createRoom({ name: "A", playerId: "p1", playerName: "A", maxPlayers: 8 }),
    );
    for (let i = 2; i <= players; i += 1) {
      value(manager.joinRoom(room.id, `p${i}`, `P${i}`));
    }
    value(manager.startGame(room.id, "p1", seeded(9)));
    room.pile = [makeCard({ id: "red-5", name: "5", type: "number", color: "red", number: 5 })];
    room.activeColor = "red";
    room.pendingDraw = 0;
    room.currentTurnIndex = 0;
    room.players[0]!.hand = [vaultToken()];
    return room;
  }

  function chooseVaultEffect(
    manager: RoomManager,
    room: import("./room.js").Room,
    cardId: string,
  ): void {
    value(
      manager.performAction(room.id, "p1", {
        gameId: room.id,
        type: "vault-choice",
        playerId: "p1",
        cardId,
      }),
    );
  }

  function pickTargets(
    manager: RoomManager,
    room: import("./room.js").Room,
    targetIds: string[],
  ): void {
    value(
      manager.performAction(room.id, "p1", {
        gameId: room.id,
        type: "choose-targets",
        playerId: "p1",
        targetIds,
      }),
    );
  }

  it("prompts pick-cards with the source players after picking targets (t1-plunder)", () => {
    const events: RoomEvent[] = [];
    const manager = createManager(events);
    const room = setupCardGame(manager, 3);
    room.players[1]!.hand = [
      makeCard({ id: "blue-3", name: "3", type: "number", color: "blue", number: 3 }),
    ];

    seededVault(manager, room, "t1-plunder", { min: 1, max: 1 });
    chooseVaultEffect(manager, room, "t1-plunder");
    pickTargets(manager, room, ["p2"]);

    expect(room.pendingVault).toBeDefined();
    expect(room.pendingVault?.stealSpec).toEqual({ min: 1, max: 3, mode: "steal" });
    expect(events).toContainEqual({
      type: "prompt",
      gameId: room.id,
      playerId: "p1",
      kind: "pick-cards",
      min: 1,
      max: 3,
      sourcePlayerIds: ["p2"],
    });
    expect(room.reveals.get("p1")).toEqual([{ playerId: "p2", permanent: false }]);
    expect(room.currentTurnIndex).toBe(0);
  });

  it("completes the play once the actor picks cards (t1-plunder)", () => {
    const events: RoomEvent[] = [];
    const manager = createManager(events);
    const room = setupCardGame(manager, 3);
    room.players[1]!.hand = [
      makeCard({ id: "blue-3", name: "3", type: "number", color: "blue", number: 3 }),
    ];

    seededVault(manager, room, "t1-plunder", { min: 1, max: 1 });
    chooseVaultEffect(manager, room, "t1-plunder");
    pickTargets(manager, room, ["p2"]);

    const result = manager.performAction(room.id, "p1", {
      gameId: room.id,
      type: "choose-cards",
      playerId: "p1",
      cardIds: ["blue-3"],
    });
    if (!result.ok) {
      throw new Error(result.error);
    }
    expect(room.pendingVault).toBeUndefined();
    expect(room.players[1]!.hand).toHaveLength(3);
    expect(room.players[0]!.hand.some((card) => card.id === "blue-3")).toBe(true);
    expect(room.currentTurnIndex).toBe(1);
    expect(
      events.some((event) => event.type === "log" && event.message.includes("steals 1 card")),
    ).toBe(true);
  });

  it("rejects choose-cards when no vault is pending", () => {
    const manager = createManager();
    const room = setupCardGame(manager, 3);

    const result = manager.performAction(room.id, "p1", {
      gameId: room.id,
      type: "choose-cards",
      playerId: "p1",
      cardIds: ["blue-3"],
    });
    if (result.ok) {
      throw new Error("expected choose-cards without a pending vault to fail");
    }
    expect(result.error).toBe("INVALID_ACTION");
  });

  it("completes immediately for an effect without a steal spec", () => {
    const events: RoomEvent[] = [];
    const manager = createManager(events);
    const room = setupCardGame(manager, 3);
    room.players[0]!.hand = [
      vaultToken(),
      makeCard({ id: "red-3", name: "3", type: "number", color: "red", number: 3 }),
    ];
    room.players[1]!.hand = [
      makeCard({ id: "blue-3", name: "3", type: "number", color: "blue", number: 3 }),
    ];

    seededVault(manager, room, "t3-scrap-shot", { min: 1, max: 1 });
    chooseVaultEffect(manager, room, "t3-scrap-shot");
    pickTargets(manager, room, ["p2"]);

    expect(events.some((event) => event.type === "prompt" && event.kind === "pick-cards")).toBe(
      false,
    );
    expect(room.pendingVault).toBeUndefined();
    expect(room.currentTurnIndex).toBe(1);
  });

  it("rejects choose-cards with too few, duplicate, or foreign cards", () => {
    const manager = createManager();
    const room = setupCardGame(manager, 3);
    room.players[1]!.hand = [
      makeCard({ id: "blue-3", name: "3", type: "number", color: "blue", number: 3 }),
    ];

    seededVault(manager, room, "t1-plunder", { min: 1, max: 1 });
    chooseVaultEffect(manager, room, "t1-plunder");
    pickTargets(manager, room, ["p2"]);

    const tooFew = manager.performAction(room.id, "p1", {
      gameId: room.id,
      type: "choose-cards",
      playerId: "p1",
      cardIds: [],
    });
    if (tooFew.ok) {
      throw new Error("expected too-few picks to fail");
    }
    expect(tooFew.error).toBe("INVALID_ACTION");

    const dupes = manager.performAction(room.id, "p1", {
      gameId: room.id,
      type: "choose-cards",
      playerId: "p1",
      cardIds: ["blue-3", "blue-3"],
    });
    if (dupes.ok) {
      throw new Error("expected duplicate picks to fail");
    }
    expect(dupes.error).toBe("INVALID_ACTION");

    const foreign = manager.performAction(room.id, "p1", {
      gameId: room.id,
      type: "choose-cards",
      playerId: "p1",
      cardIds: ["ghost-card"],
    });
    if (foreign.ok) {
      throw new Error("expected a foreign card pick to fail");
    }
    expect(foreign.error).toBe("INVALID_ACTION");

    expect(room.pendingVault).toBeDefined();
  });

  it("enforces per-player minimums and maximums (t1-jack-master)", () => {
    const manager = createManager();
    const room = setupCardGame(manager, 4);
    room.players[1]!.hand = [
      makeCard({ id: "blue-3", name: "3", type: "number", color: "blue", number: 3 }),
    ];
    room.players[2]!.hand = [
      makeCard({ id: "green-3", name: "3", type: "number", color: "green", number: 3 }),
    ];

    seededVault(manager, room, "t1-jack-master", { min: 2, max: 2 });
    chooseVaultEffect(manager, room, "t1-jack-master");
    pickTargets(manager, room, ["p2", "p3"]);

    const oneSided = manager.performAction(room.id, "p1", {
      gameId: room.id,
      type: "choose-cards",
      playerId: "p1",
      cardIds: ["blue-3"],
    });
    if (oneSided.ok) {
      throw new Error("expected a one-sided pick to fail the per-player minimum");
    }
    expect(oneSided.error).toBe("INVALID_ACTION");

    const result = manager.performAction(room.id, "p1", {
      gameId: room.id,
      type: "choose-cards",
      playerId: "p1",
      cardIds: ["blue-3", "green-3"],
    });
    if (!result.ok) {
      throw new Error(result.error);
    }
    expect(room.players[1]!.skippedTurns).toBe(4);
    expect(room.players[2]!.skippedTurns).toBe(4);
    expect(room.players[1]!.hand).toHaveLength(4);
    expect(room.players[2]!.hand).toHaveLength(4);
  });

  it("rejects picks that exceed the per-player maximum (t1-jack-master)", () => {
    const manager = createManager();
    const room = setupCardGame(manager, 4);
    room.players[1]!.hand = ["u1", "u2", "u3", "u4", "u5"].map((id) =>
      makeCard({ id, name: "5", type: "number", color: "red", number: 5 }),
    );
    room.players[2]!.hand = [
      makeCard({ id: "green-3", name: "3", type: "number", color: "green", number: 3 }),
    ];

    seededVault(manager, room, "t1-jack-master", { min: 2, max: 2 });
    chooseVaultEffect(manager, room, "t1-jack-master");
    pickTargets(manager, room, ["p2", "p3"]);

    const tooManyFromOne = manager.performAction(room.id, "p1", {
      gameId: room.id,
      type: "choose-cards",
      playerId: "p1",
      cardIds: ["u1", "u2", "u3", "u4", "u5"],
    });
    if (tooManyFromOne.ok) {
      throw new Error("expected an over-the-max pick to fail");
    }
    expect(tooManyFromOne.error).toBe("INVALID_ACTION");
  });

  it("auto-picks the per-player minimum when pick-cards times out (t1-jack-master)", () => {
    const events: RoomEvent[] = [];
    const timers: Array<() => void> = [];
    const manager = new RoomManager({
      eventSink: (event) => events.push(event),
      turnManager: new TurnManager(5000, (callback) => {
        timers.push(callback);
        return { cancel: () => {} };
      }),
    });
    const room = setupCardGame(manager, 4);
    room.players[1]!.hand = [
      makeCard({ id: "blue-3", name: "3", type: "number", color: "blue", number: 3 }),
    ];
    room.players[2]!.hand = [
      makeCard({ id: "green-3", name: "3", type: "number", color: "green", number: 3 }),
    ];

    seededVault(manager, room, "t1-jack-master", { min: 2, max: 2 });
    chooseVaultEffect(manager, room, "t1-jack-master");
    pickTargets(manager, room, ["p2", "p3"]);

    timers.pop()!();

    expect(room.pendingVault).toBeUndefined();
    expect(room.players[1]!.hand).toHaveLength(4);
    expect(room.players[2]!.hand).toHaveLength(4);
    expect(
      events.some((event) => event.type === "log" && event.message.includes("didn't pick cards")),
    ).toBe(true);
    expect(room.currentTurnIndex).toBe(1);
  });

  it("auto-steals a single card when pick-cards times out (t1-plunder)", () => {
    const events: RoomEvent[] = [];
    const timers: Array<() => void> = [];
    const manager = new RoomManager({
      eventSink: (event) => events.push(event),
      turnManager: new TurnManager(5000, (callback) => {
        timers.push(callback);
        return { cancel: () => {} };
      }),
    });
    const room = setupCardGame(manager, 3);
    room.players[1]!.hand = [
      makeCard({ id: "blue-3", name: "3", type: "number", color: "blue", number: 3 }),
      makeCard({ id: "green-3", name: "3", type: "number", color: "green", number: 3 }),
    ];

    seededVault(manager, room, "t1-plunder", { min: 1, max: 1 });
    chooseVaultEffect(manager, room, "t1-plunder");
    pickTargets(manager, room, ["p2"]);

    timers.pop()!();

    expect(room.pendingVault).toBeUndefined();
    expect(room.players[0]!.hand.some((card) => card.id === "blue-3")).toBe(true);
    expect(room.players[1]!.hand).toHaveLength(4);
    expect(room.currentTurnIndex).toBe(1);
    expect(
      events.some((event) => event.type === "log" && event.message.includes("steals 1 card")),
    ).toBe(true);
  });

  it("short-circuits to complete the play when the sources hold no cards (t1-plunder)", () => {
    const events: RoomEvent[] = [];
    const manager = createManager(events);
    const room = setupCardGame(manager, 3);
    room.players[1]!.hand = [];

    seededVault(manager, room, "t1-plunder", { min: 1, max: 1 });
    chooseVaultEffect(manager, room, "t1-plunder");
    pickTargets(manager, room, ["p2"]);

    expect(events.some((event) => event.type === "prompt" && event.kind === "pick-cards")).toBe(
      false,
    );
    expect(room.pendingVault).toBeUndefined();
    expect(room.players[1]!.hand).toHaveLength(3);
    expect(room.currentTurnIndex).toBe(1);
  });

  it("serializes revealed hands only to the entitled viewer", () => {
    const manager = createManager();
    const room = setupCardGame(manager, 3);
    room.players[1]!.hand = [
      makeCard({ id: "blue-3", name: "3", type: "number", color: "blue", number: 3 }),
    ];
    room.reveals.set("p1", [{ playerId: "p2", permanent: true }]);

    const view = value(manager.getPlayerView(room.id, "p1"));
    expect(view.revealed).toHaveLength(1);
    expect(view.revealed![0]).toEqual({
      playerId: "p2",
      cards: [expect.objectContaining({ id: "blue-3" })],
    });

    const other = value(manager.getPlayerView(room.id, "p2"));
    expect(other.revealed).toBeUndefined();
  });

  it("prunes one-shot reveals when another player acts but keeps permanent ones (t1-all-seeing-eye)", () => {
    const manager = createManager();
    const room = setupCardGame(manager, 4);
    room.players[0]!.hand = [
      vaultToken(),
      makeCard({ id: "red-3", name: "3", type: "number", color: "red", number: 3 }),
    ];

    seededVault(manager, room, "t1-all-seeing-eye", { min: 1, max: 1, allowSelf: true });
    chooseVaultEffect(manager, room, "t1-all-seeing-eye");
    pickTargets(manager, room, ["p2"]);

    const reveals = room.reveals.get("p1") ?? [];
    expect(reveals.map((r) => r.playerId).sort()).toEqual(["p1", "p2", "p3", "p4"]);
    expect(reveals.find((r) => r.playerId === "p2")?.permanent).toBe(true);
    expect(reveals.find((r) => r.playerId === "p3")?.permanent).toBe(false);
    expect(room.currentTurnIndex).toBe(1);

    value(
      manager.performAction(room.id, "p2", {
        gameId: room.id,
        type: "draw",
        playerId: "p2",
      }),
    );

    expect(room.reveals.get("p1")).toEqual([{ playerId: "p2", permanent: true }]);
  });

  it("removes reveals referencing a leaving player", () => {
    const manager = createManager();
    const room = setupCardGame(manager, 4);
    room.reveals.set("p1", [
      { playerId: "p2", permanent: true },
      { playerId: "p3", permanent: false },
    ]);

    value(manager.leaveRoom(room.id, "p2"));

    expect(room.reveals.get("p1")).toEqual([{ playerId: "p3", permanent: false }]);

    room.reveals.set("p1", [{ playerId: "p3", permanent: false }]);
    value(manager.leaveRoom(room.id, "p3"));
    expect(room.reveals.get("p1")).toBeUndefined();
  });

  it("prompts pick-cards from the actor's own hand for a selfPick effect (t3-scavenge)", () => {
    const events: RoomEvent[] = [];
    const manager = createManager(events);
    const room = setupCardGame(manager, 2);
    room.players[0]!.hand = [
      vaultToken(),
      makeCard({ id: "red-1", name: "1", type: "number", color: "red", number: 1 }),
      makeCard({ id: "red-2", name: "2", type: "number", color: "red", number: 2 }),
      makeCard({ id: "blue-3", name: "3", type: "number", color: "blue", number: 3 }),
    ];

    seededVault(manager, room, "t3-scavenge");
    chooseVaultEffect(manager, room, "t3-scavenge");

    expect(room.pendingVault?.selfPickSpec).toEqual({ min: 1, max: 5 });
    expect(events).toContainEqual({
      type: "prompt",
      gameId: room.id,
      playerId: "p1",
      kind: "pick-cards",
      min: 1,
      max: 3,
      sourcePlayerIds: ["p1"],
      selfHand: true,
      excludedCardId: "vault-silver-token-0",
    });
    expect(room.reveals.get("p1")).toBeUndefined();
    expect(room.currentTurnIndex).toBe(0);
  });

  it("completes the play once the actor picks own-hand cards to discard (t3-scavenge)", () => {
    const events: RoomEvent[] = [];
    const manager = createManager(events);
    const room = setupCardGame(manager, 2);
    room.players[0]!.hand = [
      vaultToken(),
      makeCard({ id: "red-1", name: "1", type: "number", color: "red", number: 1 }),
      makeCard({ id: "red-2", name: "2", type: "number", color: "red", number: 2 }),
      makeCard({ id: "blue-3", name: "3", type: "number", color: "blue", number: 3 }),
    ];
    const deckBefore = room.deck.length;

    seededVault(manager, room, "t3-scavenge");
    chooseVaultEffect(manager, room, "t3-scavenge");

    const result = manager.performAction(room.id, "p1", {
      gameId: room.id,
      type: "choose-cards",
      playerId: "p1",
      cardIds: ["red-1", "blue-3"],
    });
    if (!result.ok) {
      throw new Error(result.error);
    }
    expect(room.pendingVault).toBeUndefined();
    const hand = room.players[0]!.hand.map((card) => card.id);
    expect(hand).not.toContain("red-1");
    expect(hand).not.toContain("blue-3");
    expect(room.players[0]!.hand).toHaveLength(3);
    expect(room.deck).toHaveLength(deckBefore - 2);
    expect(room.currentTurnIndex).toBe(1);
    expect(
      events.some((event) => event.type === "log" && event.message.includes("discards 2 card")),
    ).toBe(true);
  });

  it("rejects choose-cards for ids outside the actor's own hand (t3-scavenge)", () => {
    const manager = createManager();
    const room = setupCardGame(manager, 2);
    room.players[0]!.hand = [
      vaultToken(),
      makeCard({ id: "red-1", name: "1", type: "number", color: "red", number: 1 }),
      makeCard({ id: "red-2", name: "2", type: "number", color: "red", number: 2 }),
    ];
    room.players[1]!.hand = [
      makeCard({ id: "green-9", name: "9", type: "number", color: "green", number: 9 }),
    ];

    seededVault(manager, room, "t3-scavenge");
    chooseVaultEffect(manager, room, "t3-scavenge");

    const result = manager.performAction(room.id, "p1", {
      gameId: room.id,
      type: "choose-cards",
      playerId: "p1",
      cardIds: ["green-9"],
    });
    if (result.ok) {
      throw new Error("expected picking a card outside the own hand to fail");
    }
    expect(result.error).toBe("INVALID_ACTION");
    expect(room.pendingVault).toBeDefined();
  });

  it("auto-picks the minimum from the own hand when pick-cards times out (t3-scavenge)", () => {
    const events: RoomEvent[] = [];
    const timers: Array<() => void> = [];
    const manager = new RoomManager({
      eventSink: (event) => events.push(event),
      turnManager: new TurnManager(5000, (callback) => {
        timers.push(callback);
        return { cancel: () => {} };
      }),
    });
    const room = setupCardGame(manager, 2);
    room.players[0]!.hand = [
      vaultToken(),
      makeCard({ id: "red-1", name: "1", type: "number", color: "red", number: 1 }),
      makeCard({ id: "red-2", name: "2", type: "number", color: "red", number: 2 }),
      makeCard({ id: "blue-3", name: "3", type: "number", color: "blue", number: 3 }),
    ];
    const deckBefore = room.deck.length;

    seededVault(manager, room, "t3-scavenge");
    chooseVaultEffect(manager, room, "t3-scavenge");

    timers.pop()!();

    expect(room.pendingVault).toBeUndefined();
    expect(room.players[0]!.hand).toHaveLength(3);
    expect(room.deck).toHaveLength(deckBefore - 1);
    expect(room.currentTurnIndex).toBe(1);
    expect(
      events.some((event) => event.type === "log" && event.message.includes("didn't pick cards")),
    ).toBe(true);
  });
});

describe("vault play-condition gating", () => {
  const draw2Card = (id: string, color: Color): Card =>
    makeCard({ id, name: "Draw 2", type: "draw2", color, effect: "Next player draws 2." });

  function setupGame(manager: RoomManager, players: number): import("./room.js").Room {
    const room = value(
      manager.createRoom({ name: "A", playerId: "p1", playerName: "A", maxPlayers: 8 }),
    );
    for (let i = 2; i <= players; i += 1) {
      value(manager.joinRoom(room.id, `p${i}`, `P${i}`));
    }
    value(manager.startGame(room.id, "p1", seeded(9)));
    room.pile = [makeCard({ id: "red-5", name: "5", type: "number", color: "red", number: 5 })];
    room.activeColor = "red";
    room.pendingDraw = 0;
    room.currentTurnIndex = 0;
    room.players[0]!.hand = [vaultToken()];
    return room;
  }

  it("alerts and re-prompts the vault choice when the actor cannot afford the play condition (t3-offerings)", () => {
    const events: RoomEvent[] = [];
    const manager = createManager(events);
    const room = setupGame(manager, 3);

    seededVault(manager, room, "t3-offerings", { min: 1, max: 1, allowSelf: true });
    const result = manager.performAction(room.id, "p1", {
      gameId: room.id,
      type: "vault-choice",
      playerId: "p1",
      cardId: "t3-offerings",
    });
    expect(result.ok).toBe(true);
    expect(events).toContainEqual({
      type: "alert",
      gameId: room.id,
      playerId: "p1",
      message: "You need 3 draw [+] cards to play Offerings.",
    });
    expect(
      events.some(
        (event) =>
          event.type === "prompt" &&
          event.kind === "vault-choice" &&
          event.offers.some((card) => card.id === "t3-offerings"),
      ),
    ).toBe(true);
    expect(room.pendingVault).toBeDefined();
    expect(room.pendingVault?.chosenCardId).toBeUndefined();
    expect(room.players[0]!.hand).toHaveLength(1);
  });

  it("accepts vault-choice when the play condition is affordable (t3-offerings)", () => {
    const manager = createManager();
    const room = setupGame(manager, 3);
    room.players[0]!.hand = [
      vaultToken(),
      draw2Card("red-draw2-0", "red"),
      draw2Card("blue-draw2-0", "blue"),
      draw2Card("green-draw2-0", "green"),
    ];

    seededVault(manager, room, "t3-offerings", { min: 1, max: 1, allowSelf: true });
    const result = manager.performAction(room.id, "p1", {
      gameId: room.id,
      type: "vault-choice",
      playerId: "p1",
      cardId: "t3-offerings",
    });
    expect(result.ok).toBe(true);
    expect(room.pendingVault).toBeDefined();
  });

  it("prompts a color for t2-jettison and discards the chosen color once picked", () => {
    const events: RoomEvent[] = [];
    const manager = createManager(events);
    const room = setupGame(manager, 3);
    room.players[0]!.hand = [
      vaultToken(),
      makeCard({ id: "red-7-0", name: "7", type: "number", color: "red", number: 7 }),
      makeCard({ id: "blue-3-0", name: "3", type: "number", color: "blue", number: 3 }),
    ];
    const deckBefore = room.deck.length;

    seededVault(manager, room, "t2-jettison");
    value(
      manager.performAction(room.id, "p1", {
        gameId: room.id,
        type: "vault-choice",
        playerId: "p1",
        cardId: "t2-jettison",
      }),
    );
    expect(room.pendingVault?.colorRequired).toBe(true);
    expect(events).toContainEqual({
      type: "prompt",
      gameId: room.id,
      playerId: "p1",
      kind: "choose-color",
    });

    const result = manager.performAction(room.id, "p1", {
      gameId: room.id,
      type: "choose-color",
      playerId: "p1",
      chosenColor: "red",
    });
    if (!result.ok) {
      throw new Error(result.error);
    }
    expect(room.pendingVault).toBeUndefined();
    expect(room.players[0]!.hand).toHaveLength(1);
    expect(room.players[0]!.hand[0]!.color).toBe("blue");
    expect(room.deck).toHaveLength(deckBefore);
    expect(room.currentTurnIndex).toBe(1);
  });
});

describe("disconnectPlayer / rejoinPlayer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function value<T>(result: RoomResult<T>): T {
    if (!result.ok) {
      throw new Error(result.error);
    }
    return result.value;
  }

  function setup(events: RoomEvent[] = []): { manager: RoomManager; gameId: string } {
    const manager = new RoomManager({
      eventSink: (event) => events.push(event),
      turnManager: new TurnManager(5000, () => ({ cancel: () => {} })),
    });
    const room = value(
      manager.createRoom({ name: "T", playerId: "p0", playerName: "P0", maxPlayers: 8 }),
    );
    value(manager.joinRoom(room.id, "p1", "P1"));
    value(manager.startGame(room.id, "p0", seeded(1)));
    room.currentTurnIndex = 0;
    return { manager, gameId: room.id };
  }

  it("disconnectPlayer marks the player as disconnected", () => {
    const { manager, gameId } = setup();
    const room = manager.getRoom(gameId)!;

    manager.disconnectPlayer(gameId, "p0", 500);

    expect(room.getPlayer("p0")?.connected).toBe(false);
    expect(room.reconnectGrace).toBeDefined();
  });

  it("disconnectPlayer cancels pendingWild for the disconnected player", () => {
    const { manager, gameId } = setup();
    const room = manager.getRoom(gameId)!;
    room.pendingWild = { cardIndex: 0, playerId: "p0" };

    manager.disconnectPlayer(gameId, "p0", 500);

    expect(room.pendingWild).toBeUndefined();
  });

  it("disconnectPlayer cancels pendingVault for the disconnected player", () => {
    const { manager, gameId } = setup();
    const room = manager.getRoom(gameId)!;
    room.pendingVault = { cardIndex: 0, playerId: "p0", tier: "vault-silver", offers: [] };

    manager.disconnectPlayer(gameId, "p0", 500);

    expect(room.pendingVault).toBeUndefined();
  });

  it("rejoinPlayer restores connected state and cancels grace", () => {
    const { manager, gameId } = setup();
    const room = manager.getRoom(gameId)!;

    manager.disconnectPlayer(gameId, "p0", 5000);
    expect(room.getPlayer("p0")?.connected).toBe(false);
    expect(room.reconnectGrace).toBeDefined();

    const result = manager.rejoinPlayer(gameId, "p0");
    expect(result.ok).toBe(true);
    expect(room.getPlayer("p0")?.connected).toBe(true);
    expect(room.reconnectGrace).toBeUndefined();
  });

  it("rejoinPlayer returns NOT_IN_ROOM for unknown player", () => {
    const { manager, gameId } = setup();
    const result = manager.rejoinPlayer(gameId, "unknown");
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.error).toBe("NOT_IN_ROOM");
    }
  });

  it("rejoinPlayer returns ROOM_NOT_FOUND for unknown game", () => {
    const manager = new RoomManager();
    const result = manager.rejoinPlayer("nope", "p0");
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.error).toBe("ROOM_NOT_FOUND");
    }
  });

  it("grace expiry removes the disconnected player via leaveRoom logic", () => {
    const events: RoomEvent[] = [];
    const manager = new RoomManager({
      eventSink: (event) => events.push(event),
      turnManager: new TurnManager(5000, () => ({ cancel: () => {} })),
    });
    const room = value(
      manager.createRoom({ name: "T", playerId: "p0", playerName: "P0", maxPlayers: 8 }),
    );
    value(manager.joinRoom(room.id, "p1", "P1"));
    value(manager.startGame(room.id, "p0", seeded(1)));
    room.currentTurnIndex = 0;

    manager.disconnectPlayer(room.id, "p0", 100);

    // Before grace expires, player is still in the room
    expect(room.getPlayer("p0")).toBeDefined();
    expect(room.getPlayer("p0")?.connected).toBe(false);

    // Advance past the grace period
    vi.advanceTimersByTime(150);

    // Player should be removed
    expect(room.getPlayer("p0")).toBeUndefined();
    expect(room.playerCount).toBe(1);
  });

  it("reconnect before grace expiry prevents removal", () => {
    const events: RoomEvent[] = [];
    const manager = new RoomManager({
      eventSink: (event) => events.push(event),
      turnManager: new TurnManager(5000, () => ({ cancel: () => {} })),
    });
    const room = value(
      manager.createRoom({ name: "T", playerId: "p0", playerName: "P0", maxPlayers: 8 }),
    );
    value(manager.joinRoom(room.id, "p1", "P1"));
    value(manager.startGame(room.id, "p0", seeded(1)));
    room.currentTurnIndex = 0;

    manager.disconnectPlayer(room.id, "p0", 5000);
    expect(room.getPlayer("p0")?.connected).toBe(false);

    // Reconnect before grace expires
    const result = manager.rejoinPlayer(room.id, "p0");
    expect(result.ok).toBe(true);

    // Advance past where grace would have expired
    vi.advanceTimersByTime(5100);

    // Player should still be in the room (grace was cancelled on reconnect)
    expect(room.getPlayer("p0")).toBeDefined();
    expect(room.getPlayer("p0")?.connected).toBe(true);
  });

  it("rejoinPlayer without active grace returns a normal PlayerView", () => {
    const { manager, gameId } = setup();
    const result = manager.rejoinPlayer(gameId, "p0");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.you.hand).toHaveLength(8);
      expect(result.value.reconnectGraceMs).toBeUndefined();
    }
  });
});
