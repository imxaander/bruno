import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Card } from "@bruno/shared";
import { RoomManager, type RoomEvent, type RoomResult } from "./room-manager.js";
import { TurnManager, TURN_DURATION_MS } from "./turn-manager.js";

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

function value<T>(result: RoomResult<T>): T {
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.value;
}

describe("TurnManager", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("fires the scheduled turn after the duration", () => {
    const manager = new TurnManager(5000);
    const callback = vi.fn();
    manager.scheduleTurn("r1", callback);
    vi.advanceTimersByTime(4999);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("replaces a previous timer for the same room", () => {
    const manager = new TurnManager(5000);
    const first = vi.fn();
    const second = vi.fn();
    manager.scheduleTurn("r1", first);
    manager.scheduleTurn("r1", second);
    vi.advanceTimersByTime(5000);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("cancels a scheduled turn", () => {
    const manager = new TurnManager(5000);
    const callback = vi.fn();
    manager.scheduleTurn("r1", callback);
    manager.cancelTurn("r1");
    vi.advanceTimersByTime(5000);
    expect(callback).not.toHaveBeenCalled();
  });
});

describe("turn timeout via RoomManager", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("auto-draws for the current player when the turn expires", () => {
    const events: RoomEvent[] = [];
    const manager = new RoomManager({
      eventSink: (event) => events.push(event),
    });
    const room = value(
      manager.createRoom({ name: "T", playerId: "p0", playerName: "P0", maxPlayers: 8 }),
    );
    value(manager.joinRoom(room.id, "p1", "P1"));
    value(manager.startGame(room.id, "p0", seeded(1)));
    room.currentTurnIndex = 0;
    const before = room.players[0]!.hand.length;

    vi.advanceTimersByTime(TURN_DURATION_MS);

    expect(room.players[0]!.hand).toHaveLength(before + 1);
    expect(room.currentTurnIndex).toBe(1);
    expect(events.some((event) => event.type === "log")).toBe(true);
    expect(
      events.some((event) => event.type === "draw" && event.playerId === "p0" && event.count === 1),
    ).toBe(true);
  });

  it("draws the full pending stack total on timeout", () => {
    const manager = new RoomManager();
    const room = value(
      manager.createRoom({ name: "T", playerId: "p0", playerName: "P0", maxPlayers: 8 }),
    );
    value(manager.joinRoom(room.id, "p1", "P1"));
    value(manager.startGame(room.id, "p0", seeded(1)));
    room.currentTurnIndex = 0;
    room.pendingDraw = 6;

    vi.advanceTimersByTime(TURN_DURATION_MS);

    expect(room.players[0]!.hand).toHaveLength(8 + 6);
    expect(room.pendingDraw).toBe(0);
  });
});

describe("performAction", () => {
  function setup(events: RoomEvent[]): { manager: RoomManager; gameId: string } {
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

  it("rejects a play from the wrong player", () => {
    const events: RoomEvent[] = [];
    const { manager, gameId } = setup(events);
    const result = manager.performAction(gameId, "p1", {
      gameId,
      type: "play",
      playerId: "p1",
      cardIndex: 0,
    });
    if (result.ok) {
      throw new Error("expected a NOT_YOUR_TURN failure");
    }
    expect(result.error).toBe("NOT_YOUR_TURN");
  });

  it("draws when no card is playable", () => {
    const events: RoomEvent[] = [];
    const { manager, gameId } = setup(events);
    const room = manager.getRoom(gameId)!;
    room.pile = [makeCard({ id: "red-5", name: "5", type: "number", color: "red", number: 5 })];
    room.activeColor = "red";
    room.pendingDraw = 0;
    room.currentTurnIndex = 0;
    room.players[0]!.hand = [
      makeCard({ id: "blue-3", name: "3", type: "number", color: "blue", number: 3 }),
      makeCard({ id: "green-4", name: "4", type: "number", color: "green", number: 4 }),
    ];

    const before = room.players[0]!.hand.length;
    const result = manager.performAction(gameId, "p0", {
      gameId,
      type: "draw",
      playerId: "p0",
    });
    if (!result.ok) {
      throw new Error(result.error);
    }
    expect(result.value.won).toBe(false);
    expect(room.players[0]!.hand).toHaveLength(before + 1);
    expect(room.pendingDraw).toBe(0);
    expect(room.currentTurnIndex).toBe(1);
    const turnEvents = events.filter((event) => event.type === "turn");
    expect(turnEvents[turnEvents.length - 1]).toMatchObject({
      type: "turn",
      playerIndex: 1,
      playerId: "p1",
    });
    expect(events.some((event) => event.type === "log" && event.message.includes("draws"))).toBe(
      true,
    );
    expect(
      events.some((event) => event.type === "draw" && event.playerId === "p0" && event.count === 1),
    ).toBe(true);
  });

  it("rejects a draw when a card is playable", () => {
    const events: RoomEvent[] = [];
    const { manager, gameId } = setup(events);
    const room = manager.getRoom(gameId)!;
    room.pile = [makeCard({ id: "red-5", name: "5", type: "number", color: "red", number: 5 })];
    room.activeColor = "red";
    room.pendingDraw = 0;
    room.currentTurnIndex = 0;
    room.players[0]!.hand = [
      makeCard({ id: "red-7", name: "7", type: "number", color: "red", number: 7 }),
      makeCard({ id: "blue-2", name: "2", type: "number", color: "blue", number: 2 }),
    ];

    const result = manager.performAction(gameId, "p0", {
      gameId,
      type: "draw",
      playerId: "p0",
    });
    if (result.ok) {
      throw new Error("expected a DRAW_NOT_ALLOWED failure");
    }
    expect(result.error).toBe("DRAW_NOT_ALLOWED");
  });

  it("plays a card, emits logs and the next turn", () => {
    const events: RoomEvent[] = [];
    const { manager, gameId } = setup(events);
    const room = manager.getRoom(gameId)!;
    const top = makeCard({ id: "red-5", name: "5", type: "number", color: "red", number: 5 });
    room.pile = [top];
    room.activeColor = "red";
    room.currentTurnIndex = 0;
    room.players[0]!.hand = [
      makeCard({ id: "red-7", name: "7", type: "number", color: "red", number: 7 }),
      makeCard({ id: "red-8", name: "8", type: "number", color: "red", number: 8 }),
    ];

    const result = manager.performAction(gameId, "p0", {
      gameId,
      type: "play",
      playerId: "p0",
      cardIndex: 0,
    });
    if (!result.ok) {
      throw new Error(result.error);
    }
    expect(result.value.won).toBe(false);
    const turnEvents = events.filter((event) => event.type === "turn");
    expect(turnEvents[turnEvents.length - 1]).toMatchObject({
      type: "turn",
      playerIndex: 1,
      playerId: "p1",
    });
    expect(events.filter((event) => event.type === "log")).not.toHaveLength(0);
  });

  it("emits ended when the last card is played", () => {
    const events: RoomEvent[] = [];
    const { manager, gameId } = setup(events);
    const room = manager.getRoom(gameId)!;
    room.players[0]!.hand = [room.pile[room.pile.length - 1]!];

    const result = manager.performAction(gameId, "p0", {
      gameId,
      type: "play",
      playerId: "p0",
      cardIndex: 0,
    });
    if (!result.ok) {
      throw new Error(result.error);
    }
    expect(result.value.won).toBe(true);
    const ended = events.find((event) => event.type === "ended");
    expect(ended?.type === "ended" && ended.winnerId).toBe("p0");
    expect(manager.getRoom(gameId)!.status).toBe("concluding");
  });
});
