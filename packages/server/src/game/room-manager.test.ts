import { describe, expect, it } from "vitest";
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
      manager.createRoom({ name: "A", playerId: "p1", playerName: "A", maxPlayers: 2 }),
    );
    value(manager.joinRoom(room.id, "p2", "B"));
    const full = manager.joinRoom(room.id, "p3", "C");
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

  it("allows a solo start (preview) and deals 8 cards", () => {
    const manager = createManager();
    const room = value(
      manager.createRoom({ name: "A", playerId: "p1", playerName: "A", maxPlayers: 8 }),
    );
    value(manager.startGame(room.id, "p1", seeded(11)));
    expect(room.status).toBe("ongoing");
    expect(room.players[0]?.hand).toHaveLength(8);
    expect(room.pile).toHaveLength(1);
    expect(room.deck).toHaveLength(119 - 8 - 1);
    expect(room.currentTurnIndex).toBe(0);
    expect(room.currentDirection).toBe(1);
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

  it("derives a PlayerView with only the actor's hand and only the pile top", () => {
    const manager = createManager();
    const room = value(
      manager.createRoom({ name: "A", playerId: "p1", playerName: "A", maxPlayers: 8 }),
    );
    value(manager.joinRoom(room.id, "p2", "B"));
    value(manager.joinRoom(room.id, "p3", "C"));
    value(manager.startGame(room.id, "p1", seeded(9)));

    const view = value(manager.getPlayerView(room.id, "p1"));
    expect(view.playerCount).toBe(3);
    expect(view.you.index).toBe(0);
    expect(view.you.hand).toHaveLength(8);
    for (const card of view.you.hand) {
      expect(card).toHaveProperty("id");
      expect(card).toHaveProperty("type");
    }
    expect(view.pileTop).not.toBeNull();
    expect(view.deckCount).toBe(119 - 3 * 8 - 1);

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
      targetSpec: { min: 3, max: 3 },
    };

    timers[0]!();

    expect(room.pendingVault).toBeUndefined();
    expect(
      events.some(
        (event) => event.type === "log" && event.message.includes("steals 6 vault token(s)"),
      ),
    ).toBe(true);
    expect(room.players[0]!.hand.filter(isVaultTokenCard)).toHaveLength(6);
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

  it("requires exactly 3 targets for vault-hunter and steals tokens", () => {
    const manager = createManager();
    const room = setupTargetGame(manager, 4);
    for (const index of [1, 2, 3]) {
      room.players[index]!.hand = [
        vaultToken(),
        vaultToken(),
        makeCard({ id: "red-7", name: "7", type: "number", color: "red", number: 7 }),
      ];
    }

    seededVault(manager, room, "t2-vault-hunter", { min: 3, max: 3 });
    const tooFew = manager.performAction(room.id, "p1", {
      gameId: room.id,
      type: "choose-targets",
      playerId: "p1",
      targetIds: ["p2", "p3"],
    });
    if (tooFew.ok) {
      throw new Error("expected too-few targets to fail");
    }
    expect(tooFew.error).toBe("INVALID_ACTION");

    const result = manager.performAction(room.id, "p1", {
      gameId: room.id,
      type: "choose-targets",
      playerId: "p1",
      targetIds: ["p2", "p3", "p4"],
    });
    if (!result.ok) {
      throw new Error(result.error);
    }
    expect(room.pendingVault).toBeUndefined();
    expect(room.players[0]!.hand.filter((card) => card.type === "vault-silver")).toHaveLength(6);
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

    seededVault(manager, room, "t2-vault-hunter", { min: 3, max: 3 });
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
