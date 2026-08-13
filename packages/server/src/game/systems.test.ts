import { describe, expect, it } from "vitest";
import type { Card } from "@bruno/shared";
import { cardsByType, MAYHEM_EVENTS } from "@bruno/shared";
import { buildDeck, dealHands, seedPile, type Rng } from "./deck.js";
import { Room } from "./room.js";
import {
  applyLocationStart,
  applyMayhem,
  chooseRandomLocation,
  effectiveVaultTier,
  rollNextMayhem,
} from "./systems.js";

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function makeCard(overrides: Partial<Card> = {}): Card {
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

  it("applies Desert location start and skips one random player", () => {
    const room = new Room({ name: "A", hostId: "p1", maxPlayers: 4 });
    room.players.push({ id: "p1", name: "A", isHost: true, hand: [], artifactIds: [] });
    room.players.push({ id: "p2", name: "B", isHost: false, hand: [], artifactIds: [] });

    room.locationId = "loc-desert";
    const logs = applyLocationStart(room, seeded(5));

    expect(logs[0]).toContain("Location: Desert");
    expect(room.players.some((player) => player.skippedTurns === 1)).toBe(true);
  });

  it("applies mayhem-4 and skips one random player for 1 turn", () => {
    const room = new Room({ name: "A", hostId: "p1", maxPlayers: 4 });
    room.players.push({ id: "p1", name: "A", isHost: true, hand: [], artifactIds: [] });
    room.players.push({ id: "p2", name: "B", isHost: false, hand: [], artifactIds: [] });

    room.mayhemEventId = "mayhem-4";
    const logs = applyMayhem(room, seeded(6));

    expect(logs[0]).toContain("Mayhem begins:");
    expect(room.players.some((player) => player.skippedTurns === 1)).toBe(true);
  });

  it("applies mayhem-5 and skips two random distinct players", () => {
    const room = new Room({ name: "A", hostId: "p1", maxPlayers: 4 });
    room.players.push({ id: "p1", name: "A", isHost: true, hand: [], artifactIds: [] });
    room.players.push({ id: "p2", name: "B", isHost: false, hand: [], artifactIds: [] });
    room.players.push({ id: "p3", name: "C", isHost: false, hand: [], artifactIds: [] });

    room.mayhemEventId = "mayhem-5";
    const logs = applyMayhem(room, seeded(7));

    expect(room.players.filter((player) => player.skippedTurns === 1)).toHaveLength(2);
    expect(logs.some((line) => line.includes("skipped"))).toBe(true);
  });

  it("applies mayhem-6 and skips everyone but the player with the most cards", () => {
    const room = new Room({ name: "A", hostId: "p1", maxPlayers: 4 });
    room.players.push({
      id: "p1",
      name: "A",
      isHost: true,
      hand: [makeCard(), makeCard()],
      artifactIds: [],
    });
    room.players.push({ id: "p2", name: "B", isHost: false, hand: [makeCard()], artifactIds: [] });

    room.mayhemEventId = "mayhem-6";
    const logs = applyMayhem(room, seeded(8));

    expect(room.players[0]!.skippedTurns).toBeUndefined();
    expect(room.players[1]!.skippedTurns).toBe(6);
    expect(logs.some((line) => line.includes("spared"))).toBe(true);
  });

  it("upgrades the first vault only on Ocean (effectiveVaultTier)", () => {
    const room = new Room({ name: "A", hostId: "p1", maxPlayers: 4 });
    room.locationId = "loc-ocean";
    room.firstVaultPlayed = false;
    expect(effectiveVaultTier(room, "vault-silver")).toBe("vault-diamond");

    room.firstVaultPlayed = true;
    expect(effectiveVaultTier(room, "vault-silver")).toBe("vault-silver");
  });

  it("upgrades every vault on Abyssal Depths (effectiveVaultTier)", () => {
    const room = new Room({ name: "A", hostId: "p1", maxPlayers: 4 });
    room.locationId = "loc-abyssal-depths";
    expect(effectiveVaultTier(room, "vault-silver")).toBe("vault-diamond");
    expect(effectiveVaultTier(room, "vault-gold")).toBe("vault-diamond");
  });

  it("leaves the tier unchanged without a location (effectiveVaultTier)", () => {
    const room = new Room({ name: "A", hostId: "p1", maxPlayers: 4 });
    expect(effectiveVaultTier(room, "vault-silver")).toBe("vault-silver");
    expect(effectiveVaultTier(room, "vault-diamond")).toBe("vault-diamond");
  });
});

function roomWithPlayers(): Room {
  const room = new Room({ name: "A", hostId: "p1", maxPlayers: 4 });
  room.players.push({ id: "p1", name: "A", isHost: true, hand: [], artifactIds: [] });
  room.players.push({ id: "p2", name: "B", isHost: false, hand: [], artifactIds: [] });
  return room;
}

describe("rollNextMayhem", () => {
  it("does not roll while mayhem is inactive (no Hell Gate location)", () => {
    const room = roomWithPlayers();
    room.deck = buildDeck(seeded(9));
    room.locationId = "loc-fields";
    room.usedMayhemIds = ["mayhem-1"];
    const logs = rollNextMayhem(room, seeded(1));
    expect(logs).toEqual([]);
    expect(room.mayhemEventId).toBeUndefined();
    expect(room.usedMayhemIds).toEqual(["mayhem-1"]);
  });

  it("excludes already-used events from the next roll", () => {
    const room = roomWithPlayers();
    room.deck = buildDeck(seeded(9));
    room.locationId = "loc-hell-gate";
    room.mayhemEventId = "mayhem-1";
    room.usedMayhemIds = ["mayhem-1"];
    const logs = rollNextMayhem(room, seeded(1));
    expect(room.mayhemEventId).not.toBe("mayhem-1");
    expect(room.usedMayhemIds).toHaveLength(2);
    expect(room.usedMayhemIds).toContain("mayhem-1");
    expect(room.usedMayhemIds).toContain(room.mayhemEventId);
    expect(logs[0]).toContain("Mayhem begins:");
  });

  it("resets the pool once every event has been used", () => {
    const room = roomWithPlayers();
    room.deck = buildDeck(seeded(9));
    room.locationId = "loc-hell-gate";
    room.mayhemEventId = "mayhem-9";
    room.usedMayhemIds = MAYHEM_EVENTS.map((event) => event.id);
    const logs = rollNextMayhem(room, seeded(2));
    expect(MAYHEM_EVENTS.map((event) => event.id)).toContain(room.mayhemEventId);
    expect(room.usedMayhemIds).toHaveLength(1);
    expect(room.usedMayhemIds[0]).toBe(room.mayhemEventId);
    expect(logs[0]).toContain("Mayhem begins:");
  });
});
