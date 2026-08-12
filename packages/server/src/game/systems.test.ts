import { describe, expect, it } from "vitest";
import { buildDeck, dealHands, seedPile, type Rng } from "./deck.js";
import { Room } from "./room.js";
import { applyLocationStart, chooseRandomLocation } from "./systems.js";
import { cardsByType } from "@bruno/shared";

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

describe("systems", () => {
  it("chooses a valid location", () => {
    const rng = seeded(1);
    const locationId = chooseRandomLocation(rng);
    expect(locationId).toBeDefined();
    expect(cardsByType("location").map((card) => card.id)).toContain(locationId);
  });

  it("applies Fields location start and draws one card per player", () => {
    const rng = seeded(2);
    const room = new Room({ name: "A", hostId: "p1", maxPlayers: 4 });
    room.players.push({ id: "p1", name: "A", isHost: true, hand: [], artifactIds: [] });
    room.players.push({ id: "p2", name: "B", isHost: false, hand: [], artifactIds: [] });

    room.deck = buildDeck(rng);
    const hands = dealHands(room.deck, room.players.length, 8);
    room.players.forEach((player, index) => {
      player.hand = hands[index] ?? [];
    });

    room.locationId = "loc-fields";
    const logs = applyLocationStart(room, rng);

    expect(logs[0]).toContain("Location: Fields");
    expect(room.players[0]!.hand).toHaveLength(9);
    expect(room.players[1]!.hand).toHaveLength(9);
    expect(room.deck.length).toBe(119 - 2 * 8 - 2);
    expect(logs.some((line) => line.includes("draws 1 card from Fields."))).toBe(true);
  });

  it("returns a log for Scorched Earth without altering hands", () => {
    const rng = seeded(3);
    const room = new Room({ name: "A", hostId: "p1", maxPlayers: 4 });
    room.players.push({ id: "p1", name: "A", isHost: true, hand: [], artifactIds: [] });
    room.players.push({ id: "p2", name: "B", isHost: false, hand: [], artifactIds: [] });

    room.deck = buildDeck(rng);
    const hands = dealHands(room.deck, room.players.length, 8);
    room.players.forEach((player, index) => {
      player.hand = hands[index] ?? [];
    });

    room.locationId = "loc-scorched-earth";
    const logs = applyLocationStart(room, rng);

    expect(logs).toEqual([
      "Location: Scorched Earth — players with 1 card may be rescued by the leader.",
    ]);
    expect(room.players[0]!.hand).toHaveLength(8);
    expect(room.players[1]!.hand).toHaveLength(8);
  });

  it("produces logs for all documented location cards", () => {
    const rng = seeded(4);
    const room = new Room({ name: "A", hostId: "p1", maxPlayers: 4 });
    room.players.push({ id: "p1", name: "A", isHost: true, hand: [], artifactIds: [] });
    room.players.push({ id: "p2", name: "B", isHost: false, hand: [], artifactIds: [] });
    room.deck = buildDeck(rng);
    room.players[0]!.hand = dealHands(room.deck, room.players.length, 8)[0] ?? [];
    room.players[1]!.hand = dealHands(room.deck, room.players.length, 8)[1] ?? [];

    const locations = [
      "loc-fields",
      "loc-silver-prairie",
      "loc-desert",
      "loc-scorched-earth",
      "loc-ocean",
      "loc-abyssal-depths",
      "loc-volcano",
      "loc-hell-gate",
    ] as const;

    for (const id of locations) {
      room.locationId = id;
      const logs = applyLocationStart(room, rng);
      expect(logs.length).toBeGreaterThanOrEqual(1);
      expect(logs[0]).toMatch(/^Location: /);
    }
  });
});
