import { describe, expect, it } from "vitest";
import { RoomManager, type RoomResult } from "./room-manager.js";
import { TurnManager } from "./turn-manager.js";

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function createManager(): RoomManager {
  return new RoomManager({
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

  it("allows a solo start (preview) and deals 8 cards", () => {
    const manager = createManager();
    const room = value(
      manager.createRoom({ name: "A", playerId: "p1", playerName: "A", maxPlayers: 8 }),
    );
    value(manager.startGame(room.id, "p1", seeded(11)));
    expect(room.status).toBe("ongoing");
    expect(room.players[0]?.hand).toHaveLength(8);
    expect(room.pile).toHaveLength(1);
    expect(room.deck).toHaveLength(110 - 8 - 1);
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
    expect(view.deckCount).toBe(110 - 3 * 8 - 1);

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
});
