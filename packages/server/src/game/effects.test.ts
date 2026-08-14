import { describe, expect, it } from "vitest";
import type { Card, Color, VaultCardType } from "@bruno/shared";
import { CARDS, isVaultTokenCard } from "@bruno/shared";
import { advanceTurn, applyDraw, isPlayable, playCard } from "./engine.js";
import {
  addPassive,
  advanceScourge,
  applySkipTurns,
  checkCutthroat,
  emitGameEvent,
  findOwnerPassive,
  getResolver,
  getResolverInputs,
  grantVaultTokens,
  isWinAllowed,
  recomputeBleed,
  registeredResolverIds,
  runDueDeferred,
  sampleVaultOffers,
  scheduleDeferred,
} from "./effects/index.js";
import { RoomManager, type RoomEvent, type RoomResult } from "./room-manager.js";
import type { Room } from "./room.js";
import { TurnManager } from "./turn-manager.js";

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function value<T>(result: RoomResult<T>): T {
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.value;
}

function startGame(
  playerCount: number,
  seed = 1,
  startOptions?: {
    locationId?: string | null;
    mayhemEventId?: string | null;
    originId?: string | null;
  },
): { manager: RoomManager; room: Room; events: RoomEvent[] } {
  const events: RoomEvent[] = [];
  const manager = new RoomManager({
    eventSink: (event) => events.push(event),
    turnManager: new TurnManager(5000, () => ({ cancel: () => {} })),
  });
  const room = value(
    manager.createRoom({ name: "T", playerId: "p0", playerName: "P0", maxPlayers: 8 }),
  );
  for (let i = 1; i < playerCount; i += 1) {
    value(manager.joinRoom(room.id, `p${i}`, `P${i}`));
  }
  value(
    manager.startGame(room.id, "p0", seeded(seed), {
      locationId: null,
      mayhemEventId: null,
      originId: null,
      ...startOptions,
    }),
  );
  room.currentTurnIndex = 0;
  return { manager, room, events };
}

function holdCard(room: Room, playerIndex: number, cardId: string): void {
  const card = CARDS.find((c) => c.id === cardId);
  if (!card) {
    throw new Error(`Unknown card: ${cardId}`);
  }
  room.players[playerIndex]!.hand = [{ ...card }];
}

function vaultToken(tier: VaultCardType): Card {
  const tierName = tier === "vault-silver" ? "Silver" : tier === "vault-gold" ? "Gold" : "Diamond";
  return {
    id: `${tier}-token-0`,
    name: `${tierName} Vault`,
    type: tier,
    tags: ["wild"],
    effect: `Play: choose one of 5 random ${tierName} Vault effects.`,
    source: "test",
    status: "stable",
  };
}

const skipCard = (): Card => ({
  id: "red-skip-0",
  name: "Skip",
  type: "skip",
  color: "red",
  tags: [],
  effect: "Skips the next player.",
  source: "test",
  status: "stable",
});

const makeColorCard = (id: string, color: Color): Card => ({
  id,
  name: "3",
  type: "number",
  color,
  number: 3,
  tags: [],
  effect: "",
  source: "test",
  status: "stable",
});

const makeCard = (overrides: Partial<Card>): Card => ({
  id: "c",
  name: "card",
  type: "number",
  tags: [],
  effect: "",
  source: "test",
  status: "stable",
  ...overrides,
});

describe("effect registry", () => {
  it("registers resolvers for every stable card", () => {
    const registered = new Set(registeredResolverIds());
    const stable = CARDS.filter((card) => card.status === "stable").map((card) => card.id);
    for (const id of stable) {
      expect(registered.has(id)).toBe(true);
    }
  });

  it("registers only resolvers for known cards", () => {
    const known = new Set(CARDS.map((card) => card.id));
    for (const id of registeredResolverIds()) {
      expect(known.has(id)).toBe(true);
    }
  });

  it("declares target input specs for pick-player cards", () => {
    expect(getResolverInputs("t3-scrap-shot")).toEqual({ targets: { min: 1, max: 1 } });
    expect(getResolverInputs("t2-scrap-shot")).toEqual({ targets: { min: 1, max: 1 } });
    expect(getResolverInputs("t2-vault-hunter")).toEqual({ targets: { min: 1, max: 3 } });
    expect(getResolverInputs("t1-g-switch")).toEqual({ targets: { min: 1, max: 1 } });
  });

  it("declares no target input for cards that affect everyone", () => {
    expect(getResolverInputs("t2-card-a-palooza")).toBeUndefined();
    expect(getResolverInputs("t1-meiosis")).toBeUndefined();
  });
});

describe("sampleVaultOffers", () => {
  it("returns only cards with a registered resolver", () => {
    const offers = sampleVaultOffers("vault-silver", 5, seeded(42));
    expect(offers.length).toBeGreaterThan(0);
    expect(offers.every((card) => getResolver(card.id) !== undefined)).toBe(true);
    expect(offers.every((card) => card.type === "vault-silver")).toBe(true);
  });

  it("returns at most the requested count, all with a resolver and all distinct", () => {
    const implemented = CARDS.filter(
      (card) => card.type === "vault-diamond" && getResolver(card.id) !== undefined,
    );
    expect(implemented.length).toBeGreaterThanOrEqual(5);
    const offers = sampleVaultOffers("vault-diamond", 5, seeded(42));
    expect(offers).toHaveLength(5);
    expect(new Set(offers.map((card) => card.id)).size).toBe(5);
    expect(offers.every((card) => getResolver(card.id) !== undefined)).toBe(true);
    expect(offers.every((card) => card.type === "vault-diamond")).toBe(true);
  });
});

describe("vault effects", () => {
  it("applies +3 to every other player (t1-meiosis)", () => {
    const { room } = startGame(3);
    const deckBefore = room.deck.length;

    const effect = getResolver("t1-meiosis")!({
      game: room,
      actor: "p0",
      random: seeded(42),
    });
    expect(effect.applied).toBe(true);
    expect(room.players[1]!.hand).toHaveLength(11);
    expect(room.players[2]!.hand).toHaveLength(11);
    expect(room.deck).toHaveLength(deckBefore - 6);
    expect(effect.log?.join(" ")).toMatch(/adds 3 cards/);
  });

  it("adds +1 to explicit targets when given (t3-mitosis)", () => {
    const { room } = startGame(3);
    const deckBefore = room.deck.length;

    const effect = getResolver("t3-mitosis")!({
      game: room,
      actor: "p0",
      targets: ["p1"],
      random: seeded(42),
    });
    expect(effect.applied).toBe(true);
    expect(room.players[1]!.hand).toHaveLength(9);
    expect(room.players[2]!.hand).toHaveLength(8);
    expect(room.deck).toHaveLength(deckBefore - 1);
  });

  it("falls back to random enemies when no targets given (t1-suicide)", () => {
    const { room } = startGame(2);
    const deckBefore = room.deck.length;

    const effect = getResolver("t1-suicide")!({
      game: room,
      actor: "p0",
      random: seeded(1),
    });
    expect(effect.applied).toBe(true);
    expect(room.players[0]!.hand).toHaveLength(20);
    expect(room.players[1]!.hand).toHaveLength(20);
    expect(room.deck).toHaveLength(deckBefore - 24);
  });

  it("keeps resolvers inert for non-vault cards", () => {
    const { room } = startGame(2);
    room.players[0]!.hand = [skipCard()];
    room.activeColor = "red";
    room.pile[0] = { ...room.pile[0]!, color: "red" };

    const result = playCard(room, room.players[0]!, 0, undefined, seeded(3));
    if (!result.ok) {
      throw new Error(result.error);
    }
    expect(result.value.log.join(" ")).not.toMatch(/adds/);
  });
});

describe("target-picking resolver batch", () => {
  it("grants vault tokens to a player's hand (grantVaultTokens)", () => {
    const { room } = startGame(2);
    const deckBefore = room.deck.length;

    const tokens = grantVaultTokens(room, room.players[0]!, "vault-gold", 2, seeded(1));
    expect(tokens).toHaveLength(2);
    expect(tokens.every(isVaultTokenCard)).toBe(true);
    expect(tokens.every((token) => token.type === "vault-gold")).toBe(true);
    expect(new Set(tokens.map((token) => token.id)).size).toBe(2);
    expect(room.players[0]!.hand).toHaveLength(10);
    expect(room.deck).toHaveLength(deckBefore);
  });

  it("applies +1 and discards 1 random card from the target (t3-scrap-shot)", () => {
    const { room } = startGame(2);
    room.players[1]!.hand = [skipCard(), skipCard(), skipCard()];
    const deckBefore = room.deck.length;

    const effect = getResolver("t3-scrap-shot")!({
      game: room,
      actor: "p0",
      targets: ["p1"],
      random: seeded(42),
    });
    expect(effect.applied).toBe(true);
    expect(room.players[1]!.hand).toHaveLength(3);
    expect(room.deck).toHaveLength(deckBefore - 1);
    expect(effect.log?.join(" ")).toMatch(/discards 1 card/);
  });

  it("applies +3 and discards 3 random cards from the target (t2-scrap-shot)", () => {
    const { room } = startGame(2);
    room.players[1]!.hand = [skipCard(), skipCard(), skipCard()];
    const deckBefore = room.deck.length;

    const effect = getResolver("t2-scrap-shot")!({
      game: room,
      actor: "p0",
      targets: ["p1"],
      random: seeded(7),
    });
    expect(effect.applied).toBe(true);
    expect(room.players[1]!.hand).toHaveLength(3);
    expect(room.deck).toHaveLength(deckBefore - 3);
  });

  it("shuffles all hands together and deals back the same counts (t2-card-a-palooza)", () => {
    const { room } = startGame(3);
    room.players[0]!.hand = [skipCard(), skipCard(), skipCard()];
    room.players[1]!.hand = [skipCard()];
    room.players[2]!.hand = [skipCard(), skipCard()];
    const before = room.players.map((player) => [...player.hand]);

    const effect = getResolver("t2-card-a-palooza")!({
      game: room,
      actor: "p0",
      random: seeded(11),
    });
    expect(effect.applied).toBe(true);

    const after = room.players.flatMap((player) => player.hand);
    const flattened = before.flat();
    expect(after.map((card) => card.id).sort()).toEqual(flattened.map((card) => card.id).sort());
    expect(room.players.map((player) => player.hand.length)).toEqual([3, 1, 2]);
  });

  it("steals 2 vault tokens in total from the picked targets (t2-vault-hunter)", () => {
    const { room } = startGame(4);
    for (const index of [1, 2, 3]) {
      room.players[index]!.hand = [vaultToken("vault-silver"), vaultToken("vault-gold")];
    }

    const effect = getResolver("t2-vault-hunter")!({
      game: room,
      actor: "p0",
      targets: ["p1", "p2", "p3"],
      random: seeded(3),
    });
    expect(effect.applied).toBe(true);
    const remaining = [1, 2, 3]
      .map((index) => room.players[index]!.hand.filter(isVaultTokenCard).length)
      .reduce((sum, count) => sum + count, 0);
    expect(remaining).toBe(4);
    expect(room.players[0]!.hand.filter(isVaultTokenCard)).toHaveLength(2);
  });

  it("can steal both vaults from a single target (t2-vault-hunter)", () => {
    const { room } = startGame(4);
    room.players[1]!.hand = [vaultToken("vault-silver"), vaultToken("vault-gold")];
    room.players[2]!.hand = [skipCard()];
    room.players[3]!.hand = [skipCard()];

    const effect = getResolver("t2-vault-hunter")!({
      game: room,
      actor: "p0",
      targets: ["p1"],
      random: seeded(7),
    });
    expect(effect.applied).toBe(true);
    expect(room.players[1]!.hand.filter(isVaultTokenCard)).toHaveLength(0);
    expect(room.players[0]!.hand.filter(isVaultTokenCard)).toHaveLength(2);
  });

  it("steals what is available when the targets hold fewer than 2 vaults (t2-vault-hunter)", () => {
    const { room } = startGame(3);
    room.players[1]!.hand = [vaultToken("vault-silver")];
    room.players[2]!.hand = [skipCard()];

    const effect = getResolver("t2-vault-hunter")!({
      game: room,
      actor: "p0",
      targets: ["p1", "p2"],
      random: seeded(11),
    });
    expect(effect.applied).toBe(true);
    expect(room.players[1]!.hand.filter(isVaultTokenCard)).toHaveLength(0);
    expect(room.players[0]!.hand.filter(isVaultTokenCard)).toHaveLength(1);
  });

  it("switches the actor's hand with the target's (t1-g-switch)", () => {
    const { room } = startGame(2);
    room.players[0]!.hand = [skipCard()];
    room.players[1]!.hand = [skipCard(), skipCard()];

    const effect = getResolver("t1-g-switch")!({
      game: room,
      actor: "p0",
      targets: ["p1"],
      random: seeded(5),
    });
    expect(effect.applied).toBe(true);
    expect(room.players[0]!.hand).toHaveLength(2);
    expect(room.players[1]!.hand).toHaveLength(1);
    expect(effect.log?.join(" ")).toMatch(/switches hands/);
  });
});

describe("wave 1 resolver batch", () => {
  it("skips two random players for 1 turn (t3-hush)", () => {
    const { room } = startGame(4);
    const effect = getResolver("t3-hush")!({ game: room, actor: "p0", random: seeded(1) });
    expect(effect.applied).toBe(true);
    expect(room.players.filter((player) => player.skippedTurns === 1)).toHaveLength(2);
    expect(room.players[0]!.skippedTurns ?? 0).toBe(0);
  });

  it("skips two random players for 3 turns (t2-hush)", () => {
    const { room } = startGame(4);
    const effect = getResolver("t2-hush")!({ game: room, actor: "p0", random: seeded(2) });
    expect(effect.applied).toBe(true);
    expect(room.players.filter((player) => player.skippedTurns === 3)).toHaveLength(2);
  });

  it("skips all enemies for 3 turns (t1-global-silence)", () => {
    const { room } = startGame(4);
    const effect = getResolver("t1-global-silence")!({
      game: room,
      actor: "p0",
      random: seeded(1),
    });
    expect(effect.applied).toBe(true);
    expect(room.players[0]!.skippedTurns ?? 0).toBe(0);
    for (let i = 1; i < 4; i += 1) {
      expect(room.players[i]!.skippedTurns).toBe(3);
    }
  });

  it("skips all enemies for 20 turns (t1-sloth)", () => {
    const { room } = startGame(3);
    const effect = getResolver("t1-sloth")!({ game: room, actor: "p0", random: seeded(1) });
    expect(effect.applied).toBe(true);
    expect(room.players[1]!.skippedTurns).toBe(20);
    expect(room.players[2]!.skippedTurns).toBe(20);
  });

  it("skips the actor on a coin flip heads (t3-prototype-z)", () => {
    const { room } = startGame(3);
    const effect = getResolver("t3-prototype-z")!({
      game: room,
      actor: "p0",
      random: () => 0.1,
    });
    expect(effect.applied).toBe(true);
    expect(room.players[0]!.skippedTurns).toBe(1);
    expect(effect.log?.join(" ")).toMatch(/heads/);
  });

  it("adds +4 to a target on a coin flip tails (t3-prototype-z)", () => {
    const { room } = startGame(3);
    room.players[1]!.hand = [skipCard()];
    const before = room.deck.length;
    const effect = getResolver("t3-prototype-z")!({
      game: room,
      actor: "p0",
      targets: ["p1"],
      random: () => 0.9,
    });
    expect(effect.applied).toBe(true);
    expect(room.players[0]!.skippedTurns ?? 0).toBe(0);
    expect(room.players[1]!.hand).toHaveLength(5);
    expect(room.deck).toHaveLength(before - 4);
    expect(effect.log?.join(" ")).toMatch(/tails/);
  });

  it("skips the actor for 2 turns on heads (t2-augmented-zep-y)", () => {
    const { room } = startGame(3);
    const effect = getResolver("t2-augmented-zep-y")!({
      game: room,
      actor: "p0",
      random: () => 0.1,
    });
    expect(effect.applied).toBe(true);
    expect(room.players[0]!.skippedTurns).toBe(2);
  });

  it("blindly swaps 2 cards with a target (t3-trade-sector)", () => {
    const { room } = startGame(3);
    room.players[0]!.hand = [skipCard(), skipCard(), skipCard(), skipCard()];
    room.players[1]!.hand = [skipCard(), skipCard()];
    const effect = getResolver("t3-trade-sector")!({
      game: room,
      actor: "p0",
      targets: ["p1"],
      random: seeded(3),
    });
    expect(effect.applied).toBe(true);
    expect(room.players[0]!.hand).toHaveLength(4);
    expect(room.players[1]!.hand).toHaveLength(2);
    expect(effect.log?.join(" ")).toMatch(/trades 2 card/);
  });

  it("draws fallback cards when the trade target holds fewer than 2 (t3-trade-sector)", () => {
    const { room } = startGame(3);
    room.players[1]!.hand = [skipCard()];
    const deckBefore = room.deck.length;
    const effect = getResolver("t3-trade-sector")!({
      game: room,
      actor: "p0",
      targets: ["p1"],
      random: seeded(4),
    });
    expect(effect.applied).toBe(true);
    expect(room.players[1]!.hand).toHaveLength(2);
    expect(room.deck).toHaveLength(deckBefore - 1);
    expect(effect.log?.join(" ")).toMatch(/draws/);
  });

  it("discards the picked cards and redraws the same amount (t3-scavenge)", () => {
    const { room } = startGame(2);
    const hand = ["red-skip-0", "blue-skip-1", "green-skip-2", "yellow-skip-3", "red-skip-4", "blue-skip-5"].map(
      (id) => ({ ...skipCard(), id }),
    );
    room.players[0]!.hand = hand;
    const picked = hand.slice(0, 3).map((card) => card.id);
    const deckBefore = room.deck.length;
    const effect = getResolver("t3-scavenge")!({
      game: room,
      actor: "p0",
      picked,
      random: seeded(2),
    });
    expect(effect.applied).toBe(true);
    const log = effect.log?.join(" ") ?? "";
    expect(log).toMatch(/discards 3 card\(s\) and draws 3/);
    expect(room.players[0]!.hand).toHaveLength(6);
    for (const id of picked) {
      expect(room.players[0]!.hand.map((card) => card.id)).not.toContain(id);
    }
    expect(room.deck).toHaveLength(deckBefore - 3);
  });

  it("redraws the whole hand and keeps the turn (t2-rummage)", () => {
    const { room } = startGame(2);
    room.players[0]!.hand = [skipCard(), skipCard(), skipCard()];
    const deckBefore = room.deck.length;
    const effect = getResolver("t2-rummage")!({ game: room, actor: "p0", random: seeded(5) });
    expect(effect.applied).toBe(true);
    expect(effect.keepTurn).toBe(true);
    expect(room.players[0]!.hand).toHaveLength(3);
    expect(room.deck).toHaveLength(deckBefore - 3);
    expect(effect.log?.join(" ")).toMatch(/redraws 3/);
  });

  it("grants 2 Silver Vault tokens (t2-twice-than-one)", () => {
    const { room } = startGame(2);
    const effect = getResolver("t2-twice-than-one")!({
      game: room,
      actor: "p0",
      random: seeded(1),
    });
    expect(effect.applied).toBe(true);
    expect(room.players[0]!.hand.filter((card) => card.type === "vault-silver")).toHaveLength(2);
  });

  it("grants 3 Silver Vault tokens (t1-thrice-than-twice)", () => {
    const { room } = startGame(2);
    const effect = getResolver("t1-thrice-than-twice")!({
      game: room,
      actor: "p0",
      random: seeded(1),
    });
    expect(effect.applied).toBe(true);
    expect(room.players[0]!.hand.filter((card) => card.type === "vault-silver")).toHaveLength(3);
  });

  it("switches hands with a target and then another pair (t1-envy)", () => {
    const { room } = startGame(4);
    room.players[0]!.hand = [skipCard()];
    room.players[1]!.hand = [skipCard(), skipCard()];
    room.players[2]!.hand = [skipCard(), skipCard(), skipCard()];
    room.players[3]!.hand = [skipCard(), skipCard(), skipCard(), skipCard()];

    const effect = getResolver("t1-envy")!({
      game: room,
      actor: "p0",
      targets: ["p1"],
      random: seeded(6),
    });
    expect(effect.applied).toBe(true);
    expect(room.players[0]!.hand).toHaveLength(2);
    expect(room.players[1]!.hand).toHaveLength(1);
    expect(effect.log?.join(" ")).toMatch(/switch hands/);
  });

  it("adds +6 to all enemies and skips the enemy with the most cards (t1-genesis)", () => {
    const { room } = startGame(3);
    room.players[1]!.hand = [skipCard(), skipCard()];
    room.players[2]!.hand = [skipCard()];
    const effect = getResolver("t1-genesis")!({ game: room, actor: "p0", random: seeded(7) });
    expect(effect.applied).toBe(true);
    expect(room.players[1]!.hand).toHaveLength(8);
    expect(room.players[2]!.hand).toHaveLength(7);
    expect(room.players[1]!.skippedTurns).toBe(1);
    expect(room.players[2]!.skippedTurns ?? 0).toBe(0);
  });
});

describe("wave 1 play-condition resolver batch", () => {
  const drawPlusCard = (id: string, color?: Color): Card =>
    ({
      id,
      name: "Draw 2",
      type: "draw2",
      color,
      tags: [],
      effect: "Next player draws 2.",
      source: "test",
      status: "stable",
    }) as Card;

  const redCard = (id: string): Card =>
    ({
      id,
      name: "7",
      type: "number",
      color: "red",
      number: 7,
      tags: [],
      effect: "",
      source: "test",
      status: "stable",
    }) as Card;

  it("discards 3 draw [+] cards, gains a Silver Vault and +2s a picked player (t3-offerings)", () => {
    const { room } = startGame(3);
    room.players[0]!.hand = [
      drawPlusCard("red-draw2-0", "red"),
      drawPlusCard("blue-draw2-0", "blue"),
      drawPlusCard("green-draw2-0", "green"),
    ];
    room.players[1]!.hand = [skipCard()];
    const deckBefore = room.deck.length;

    const effect = getResolver("t3-offerings")!({
      game: room,
      actor: "p0",
      targets: ["p1"],
      random: seeded(2),
    });
    expect(effect.applied).toBe(true);
    expect(room.players[0]!.hand.filter((card) => card.type === "draw2")).toHaveLength(0);
    expect(room.players[0]!.hand.filter((card) => card.type === "vault-silver")).toHaveLength(1);
    expect(room.players[1]!.hand).toHaveLength(3);
    expect(room.deck).toHaveLength(deckBefore - 2);
    expect(effect.log?.join(" ")).toMatch(/discards 3 draw/);
  });

  it("allows self as the +2 target for t3-offerings", () => {
    const { room } = startGame(2);
    room.players[0]!.hand = [
      drawPlusCard("red-draw2-0", "red"),
      drawPlusCard("blue-draw2-0", "blue"),
      drawPlusCard("green-draw2-0", "green"),
    ];

    const effect = getResolver("t3-offerings")!({
      game: room,
      actor: "p0",
      targets: ["p0"],
      random: seeded(2),
    });
    expect(effect.applied).toBe(true);
    expect(room.players[0]!.hand.filter((card) => card.type === "vault-silver")).toHaveLength(1);
  });

  it("stays unapplied when the actor cannot discard 3 draw [+] cards (t3-offerings)", () => {
    const { room } = startGame(2);
    room.players[0]!.hand = [drawPlusCard("red-draw2-0", "red"), skipCard()];

    const effect = getResolver("t3-offerings")!({ game: room, actor: "p0", random: seeded(2) });
    expect(effect.applied).toBe(false);
    expect(room.players[0]!.hand).toHaveLength(2);
  });

  it("discards 5 red cards, gains a Gold Vault and +2s 2 enemies (t2-ruin)", () => {
    const { room } = startGame(4);
    room.players[0]!.hand = Array.from({ length: 5 }, (_, i) => redCard(`red-7-${i}`));
    room.players[1]!.hand = [skipCard()];
    room.players[2]!.hand = [skipCard()];
    const deckBefore = room.deck.length;

    const effect = getResolver("t2-ruin")!({
      game: room,
      actor: "p0",
      targets: ["p1", "p2"],
      random: seeded(3),
    });
    expect(effect.applied).toBe(true);
    expect(room.players[0]!.hand.filter((card) => card.color === "red")).toHaveLength(0);
    expect(room.players[0]!.hand.filter((card) => card.type === "vault-gold")).toHaveLength(1);
    expect(room.players[1]!.hand).toHaveLength(3);
    expect(room.players[2]!.hand).toHaveLength(3);
    expect(room.players[3]!.hand).toHaveLength(8);
    expect(room.deck).toHaveLength(deckBefore - 4);
    expect(effect.log?.join(" ")).toMatch(/discards 5 red/);
  });

  it("stays unapplied when the actor cannot discard 5 red cards (t2-ruin)", () => {
    const { room } = startGame(2);
    room.players[0]!.hand = Array.from({ length: 3 }, (_, i) => redCard(`red-7-${i}`));

    const effect = getResolver("t2-ruin")!({ game: room, actor: "p0", random: seeded(3) });
    expect(effect.applied).toBe(false);
    expect(room.players[0]!.hand).toHaveLength(3);
  });

  it("discards 4 special cards and draws 10 (t2-sacrificial-lamb)", () => {
    const { room } = startGame(2);
    room.players[0]!.hand = [
      skipCard(),
      drawPlusCard("red-draw2-0", "red"),
      makeCard({ id: "s1", name: "Reverse", type: "reverse", color: "blue" }),
      makeCard({ id: "s2", name: "Draw 4", type: "draw4", color: "red" }),
    ];
    const deckBefore = room.deck.length;

    const effect = getResolver("t2-sacrificial-lamb")!({
      game: room,
      actor: "p0",
      random: seeded(4),
    });
    expect(effect.applied).toBe(true);
    expect(room.players[0]!.hand).toHaveLength(10);
    expect(room.deck).toHaveLength(deckBefore - 10);
    expect(effect.log?.join(" ")).toMatch(/discards 4 special cards and draws 10/);
  });

  it("stays unapplied when the actor has fewer than 2 special cards (t2-sacrificial-lamb)", () => {
    const { room } = startGame(2);
    room.players[0]!.hand = [redCard("red-7-0")];

    const effect = getResolver("t2-sacrificial-lamb")!({
      game: room,
      actor: "p0",
      random: seeded(4),
    });
    expect(effect.applied).toBe(false);
    expect(room.players[0]!.hand).toHaveLength(1);
  });

  it("discards all cards of the chosen color (t2-jettison)", () => {
    const { room } = startGame(2);
    room.players[0]!.hand = [
      redCard("red-7-0"),
      redCard("red-8-0"),
      makeColorCard("blue-3-0", "blue"),
      makeColorCard("green-5-0", "green"),
    ];
    const effect = getResolver("t2-jettison")!({
      game: room,
      actor: "p0",
      chosenColor: "red",
      random: seeded(5),
    });
    expect(effect.applied).toBe(true);
    expect(room.players[0]!.hand.some((card) => card.color === "red")).toBe(false);
    expect(room.players[0]!.hand).toHaveLength(2);
    expect(effect.log?.join(" ")).toMatch(/discards all 2 red/);
  });
});

describe("vault token flow", () => {
  it("prompts a choice of the tier's implemented offers when a token is played", () => {
    const { manager, room, events } = startGame(2);
    room.players[0]!.hand = [vaultToken("vault-diamond"), skipCard()];

    const result = manager.performAction(room.id, "p0", {
      gameId: room.id,
      type: "play",
      playerId: "p0",
      cardIndex: 0,
    });
    if (!result.ok) {
      throw new Error(result.error);
    }
    expect(room.pendingVault).toMatchObject({
      cardIndex: 0,
      playerId: "p0",
      tier: "vault-diamond",
    });
    expect(room.pendingVault?.offers).toHaveLength(3);
    expect(room.pendingVault?.offers.every((card) => card.type === "vault-diamond")).toBe(true);
    expect(room.pendingVault?.offers.every((card) => getResolver(card.id) !== undefined)).toBe(
      true,
    );
    expect(new Set(room.pendingVault?.offers.map((card) => card.id)).size).toBe(3);
    expect(room.currentTurnIndex).toBe(0);

    const prompt = events.find((event) => event.type === "prompt");
    expect(prompt).toMatchObject({ kind: "vault-choice", playerId: "p0" });
  });

  it("completes the play after a valid vault choice", () => {
    const { manager, room } = startGame(2);
    room.players[0]!.hand = [vaultToken("vault-silver"), skipCard()];
    value(
      manager.performAction(room.id, "p0", {
        gameId: room.id,
        type: "play",
        playerId: "p0",
        cardIndex: 0,
      }),
    );
    const offers = room.pendingVault!.offers;
    const chosen = offers.find((offer) => !getResolverInputs(offer.id)?.targets) ?? offers[0]!;

    const result = manager.performAction(room.id, "p0", {
      gameId: room.id,
      type: "vault-choice",
      playerId: "p0",
      cardId: chosen.id,
    });
    if (!result.ok) {
      throw new Error(result.error);
    }
    expect(room.pendingVault).toBeUndefined();
    expect(room.players[0]!.hand.some((card) => isVaultTokenCard(card))).toBe(false);
    expect(room.currentTurnIndex).toBe(1);
  });

  it("rejects a vault choice that is not among the offers", () => {
    const { manager, room } = startGame(2);
    room.players[0]!.hand = [vaultToken("vault-silver"), skipCard()];
    value(
      manager.performAction(room.id, "p0", {
        gameId: room.id,
        type: "play",
        playerId: "p0",
        cardIndex: 0,
      }),
    );

    const result = manager.performAction(room.id, "p0", {
      gameId: room.id,
      type: "vault-choice",
      playerId: "p0",
      cardId: "t1-meiosis",
    });
    if (result.ok) {
      throw new Error("expected an invalid vault choice to fail");
    }
    expect(result.error).toBe("INVALID_VAULT_CHOICE");
    expect(room.pendingVault).toBeDefined();
  });

  it("rejects vault-choice when no vault is pending", () => {
    const { manager, room } = startGame(2);

    const result = manager.performAction(room.id, "p0", {
      gameId: room.id,
      type: "vault-choice",
      playerId: "p0",
      cardId: "t1-meiosis",
    });
    if (result.ok) {
      throw new Error("expected a missing pending vault to fail");
    }
    expect(result.error).toBe("PROMPT_EXPIRED");
  });

  it("rejects play and draw while a vault choice is pending", () => {
    const { manager, room } = startGame(2);
    room.players[0]!.hand = [vaultToken("vault-silver"), skipCard()];
    value(
      manager.performAction(room.id, "p0", {
        gameId: room.id,
        type: "play",
        playerId: "p0",
        cardIndex: 0,
      }),
    );

    const play = manager.performAction(room.id, "p0", {
      gameId: room.id,
      type: "play",
      playerId: "p0",
      cardIndex: 1,
    });
    if (play.ok) {
      throw new Error("expected a play while pending to fail");
    }
    expect(play.error).toBe("INVALID_ACTION");

    const draw = manager.performAction(room.id, "p0", {
      gameId: room.id,
      type: "draw",
      playerId: "p0",
    });
    if (draw.ok) {
      throw new Error("expected a draw while pending to fail");
    }
    expect(draw.error).toBe("DRAW_NOT_ALLOWED");
  });

  it("runs the chosen offer's resolver when the token play completes", () => {
    const { room } = startGame(3);
    room.players[0]!.hand = [vaultToken("vault-diamond")];
    room.pendingVault = {
      cardIndex: 0,
      playerId: "p0",
      tier: "vault-diamond",
      offers: [CARDS.find((c) => c.id === "t1-meiosis")!],
      chosenCardId: "t1-meiosis",
    };

    const result = playCard(room, room.players[0]!, 0, undefined, seeded(42));
    if (!result.ok) {
      throw new Error(result.error);
    }
    expect(room.players[1]!.hand).toHaveLength(11);
    expect(room.players[2]!.hand).toHaveLength(11);
    expect(room.pendingVault).toBeUndefined();
    expect(result.value.log.join(" ")).toMatch(/adds 3 cards/);
  });
});

describe("vault playability", () => {
  it("allows a vault token regardless of the active color", () => {
    const { room } = startGame(2);
    room.players[0]!.hand = [vaultToken("vault-diamond")];
    room.activeColor = "green";
    room.pile[0] = { ...room.pile[0]!, color: "green" };

    const result = playCard(room, room.players[0]!, 0, undefined, seeded(4));
    if (!result.ok) {
      throw new Error(result.error);
    }
  });

  it("keeps the pre-vault color active after a vault token", () => {
    const { room } = startGame(2);
    room.activeColor = "green";
    room.players[0]!.hand = [vaultToken("vault-silver")];
    room.pendingVault = {
      cardIndex: 0,
      playerId: "p0",
      tier: "vault-silver",
      offers: [CARDS.find((c) => c.id === "t3-scrap-shot")!],
      chosenCardId: "t3-scrap-shot",
    };

    const result = playCard(room, room.players[0]!, 0, undefined, seeded(6));
    if (!result.ok) {
      throw new Error(result.error);
    }
    expect(room.activeColor).toBe("green");
    const greenCard = {
      id: "green-4",
      name: "4",
      type: "number" as const,
      color: "green" as const,
      number: 4,
      tags: [],
      effect: "",
      source: "test",
      status: "stable" as const,
    };
    const redCard = { ...greenCard, id: "red-4", color: "red" as const };
    expect(isPlayable(greenCard, room)).toBe(true);
    expect(isPlayable(redCard, room)).toBe(false);
  });

  it("blocks vault tokens during a pending draw stack", () => {
    const { room } = startGame(2);
    room.players[0]!.hand = [vaultToken("vault-silver")];
    room.pendingDraw = 4;

    const result = playCard(room, room.players[0]!, 0, undefined, seeded(5));
    if (result.ok) {
      throw new Error("expected the vault token to be blocked");
    }
    expect(result.error).toBe("CARD_NOT_PLAYABLE");
  });
});

describe("wave 2 resolver batch", () => {
  it("declares steal inputs for pick-card effects", () => {
    expect(getResolverInputs("t1-plunder")).toEqual({
      targets: { min: 1, max: 1 },
      steal: { min: 1, max: 3, mode: "steal" },
    });
    expect(getResolverInputs("t1-avarice")).toEqual({
      targets: { min: 1, max: 5 },
      steal: { min: 1, max: 5, mode: "steal" },
    });
    expect(getResolverInputs("t1-scrapheap")).toEqual({
      targets: { min: 1, max: 7 },
      steal: { min: 1, max: 7, mode: "discard" },
    });
    expect(getResolverInputs("t1-scrapstorm")).toEqual({
      targets: { min: 1, max: 15 },
      steal: { min: 1, max: 15, mode: "give" },
    });
    expect(getResolverInputs("t1-jack-of-all-trades")).toEqual({
      targets: { min: 1, max: 1 },
      steal: { min: 1, max: 1, mode: "discard" },
    });
    expect(getResolverInputs("t1-jack-master")).toEqual({
      targets: { min: 2, max: 2 },
      steal: { min: 2, max: 8, mode: "discard", perPlayer: { min: 1, max: 4 } },
    });
    expect(getResolverInputs("t2-future-sight")).toEqual({
      targets: { min: 1, max: 1, allowSelf: true },
    });
    expect(getResolverInputs("t1-all-seeing-eye")).toEqual({
      targets: { min: 1, max: 1, allowSelf: true },
    });
    expect(getResolverInputs("t1-omniscient")).toEqual({
      targets: { min: 1, max: 1, allowSelf: true },
    });
  });

  it("reveals one target hand without making it permanent (t2-future-sight)", () => {
    const { room } = startGame(3);
    const effect = getResolver("t2-future-sight")!({
      game: room,
      actor: "p0",
      targets: ["p1"],
      random: seeded(1),
    });
    expect(effect.applied).toBe(true);
    expect(room.reveals.get("p0")).toEqual([{ playerId: "p1", permanent: false }]);
    expect(effect.log?.join(" ")).toMatch(/sees p1's hand/i);
  });

  it("adds +3 to a target then steals the picked cards (t1-plunder)", () => {
    const { room } = startGame(2);
    room.players[1]!.hand = [
      makeColorCard("c1", "red"),
      makeColorCard("c2", "blue"),
      makeColorCard("c3", "green"),
    ];
    const actorBefore = room.players[0]!.hand.length;

    const effect = getResolver("t1-plunder")!({
      game: room,
      actor: "p0",
      targets: ["p1"],
      picked: ["c1", "c2"],
      random: seeded(42),
    });
    expect(effect.applied).toBe(true);
    expect(room.players[0]!.hand).toHaveLength(actorBefore + 2);
    expect(room.players[1]!.hand).toHaveLength(4);
    expect(room.players[1]!.hand.some((card) => card.id === "c1")).toBe(false);
    expect(room.players[1]!.hand.some((card) => card.id === "c2")).toBe(false);
    expect(effect.log?.join(" ")).toMatch(/steals 2 card\(s\)/);
  });

  it("adds +2 to all players then steals the picked cards (t1-avarice)", () => {
    const { room } = startGame(3);
    room.players[1]!.hand = [
      makeColorCard("c1", "red"),
      makeColorCard("c2", "blue"),
      makeColorCard("c3", "green"),
    ];
    const before = [0, 1, 2].map((index) => room.players[index]!.hand.length);

    const effect = getResolver("t1-avarice")!({
      game: room,
      actor: "p0",
      targets: ["p1", "p2"],
      picked: ["c1", "c2"],
      random: seeded(7),
    });
    expect(effect.applied).toBe(true);
    expect(room.players[0]!.hand).toHaveLength(before[0]! + 4);
    expect(room.players[2]!.hand).toHaveLength(before[2]! + 2);
    expect(room.players[1]!.hand).toHaveLength(before[1]!);
    expect(room.players[0]!.hand.some((card) => card.id === "c1")).toBe(true);
    expect(room.players[0]!.hand.some((card) => card.id === "c2")).toBe(true);
  });

  it("adds +1 to enemies then discards the picked cards (t1-scrapheap)", () => {
    const { room } = startGame(3);
    room.players[1]!.hand = [
      makeColorCard("c1", "red"),
      makeColorCard("c2", "blue"),
      makeColorCard("c3", "green"),
    ];
    const actorBefore = room.players[0]!.hand.length;

    const effect = getResolver("t1-scrapheap")!({
      game: room,
      actor: "p0",
      targets: ["p1", "p2"],
      picked: ["c1", "c2"],
      random: seeded(11),
    });
    expect(effect.applied).toBe(true);
    expect(room.players[0]!.hand).toHaveLength(actorBefore);
    expect(room.players[1]!.hand.some((card) => card.id === "c1")).toBe(false);
    expect(room.players[1]!.hand.some((card) => card.id === "c2")).toBe(false);
    expect(effect.log?.join(" ")).toMatch(/discards 2 card\(s\)/);
  });

  it("redistributes picked cards to players other than their holders (t1-scrapstorm)", () => {
    const { room } = startGame(4);
    room.players[1]!.hand = [
      makeColorCard("c1", "red"),
      makeColorCard("c2", "blue"),
      makeColorCard("c3", "green"),
    ];
    const holderBefore = room.players[1]!.hand.length;
    const othersBefore = [0, 2, 3].map((index) => room.players[index]!.hand.length);

    const effect = getResolver("t1-scrapstorm")!({
      game: room,
      actor: "p0",
      targets: ["p1"],
      picked: ["c1", "c2", "c3"],
      random: seeded(42),
    });
    expect(effect.applied).toBe(true);
    expect(room.players[1]!.hand).toHaveLength(holderBefore - 3);
    const othersAfter = [0, 2, 3].map((index) => room.players[index]!.hand.length);
    const totalGained = othersAfter.reduce(
      (sum, count, index) => sum + count - othersBefore[index]!,
      0,
    );
    expect(totalGained).toBe(3);
    const recipients = [0, 2, 3].flatMap((index) => room.players[index]!.hand.map((c) => c.id));
    for (const id of ["c1", "c2", "c3"]) {
      expect(recipients).toContain(id);
    }
  });

  it("buff, skip, reveal and discard from random enemies (t1-jack-of-all-trades)", () => {
    const { room } = startGame(3);
    room.players[1]!.hand = [makeColorCard("c1", "red"), makeColorCard("c2", "blue")];
    const actorBefore = room.players[0]!.hand.length;

    const effect = getResolver("t1-jack-of-all-trades")!({
      game: room,
      actor: "p0",
      targets: ["p1"],
      picked: ["c1"],
      random: seeded(3),
    });
    expect(effect.applied).toBe(true);
    expect(room.players[0]!.hand).toHaveLength(actorBefore);
    expect(room.players[1]!.hand.some((card) => card.id === "c1")).toBe(false);
    expect(room.players.filter((player) => player.skippedTurns === 1)).toHaveLength(1);
    const reveals = room.reveals.get("p0") ?? [];
    expect(reveals).toHaveLength(1);
    expect(reveals[0]!.permanent).toBe(false);
    expect(effect.log?.join(" ")).toMatch(/discards 1 card/);
  });

  it("adds +4 and 4 skipped turns to both targets and discards picked cards (t1-jack-master)", () => {
    const { room } = startGame(3);
    room.players[1]!.hand = [
      makeColorCard("c1", "red"),
      makeColorCard("c2", "blue"),
      makeColorCard("c3", "green"),
      makeColorCard("c4", "yellow"),
      makeColorCard("c5", "red"),
    ];
    room.players[2]!.hand = [makeColorCard("d1", "red"), makeColorCard("d2", "blue")];
    const before1 = room.players[1]!.hand.length;
    const before2 = room.players[2]!.hand.length;

    const effect = getResolver("t1-jack-master")!({
      game: room,
      actor: "p0",
      targets: ["p1", "p2"],
      picked: ["c1", "c2", "d1"],
      random: seeded(5),
    });
    expect(effect.applied).toBe(true);
    expect(room.players[1]!.skippedTurns).toBe(4);
    expect(room.players[2]!.skippedTurns).toBe(4);
    expect(room.players[1]!.hand).toHaveLength(before1 + 4 - 2);
    expect(room.players[2]!.hand).toHaveLength(before2 + 4 - 1);
    const reveals = room.reveals.get("p0") ?? [];
    expect(reveals.map((r) => r.playerId).sort()).toEqual(["p1", "p2"]);
    expect(reveals.every((r) => r.permanent === false)).toBe(true);
    expect(effect.log?.join(" ")).toMatch(/discards 3 card\(s\)/);
  });

  it("reveals everyone and permanently reveals one target (t1-all-seeing-eye)", () => {
    const { room } = startGame(3);
    const effect = getResolver("t1-all-seeing-eye")!({
      game: room,
      actor: "p0",
      targets: ["p2"],
      random: seeded(1),
    });
    expect(effect.applied).toBe(true);
    const reveals = room.reveals.get("p0") ?? [];
    expect(reveals.map((r) => r.playerId).sort()).toEqual(["p0", "p1", "p2"]);
    expect(reveals.find((r) => r.playerId === "p2")?.permanent).toBe(true);
    expect(reveals.find((r) => r.playerId === "p1")?.permanent).toBe(false);
  });

  it("permanently reveals everyone and skips the target 5 turns (t1-omniscient)", () => {
    const { room } = startGame(3);
    const effect = getResolver("t1-omniscient")!({
      game: room,
      actor: "p0",
      targets: ["p1"],
      random: seeded(1),
    });
    expect(effect.applied).toBe(true);
    const reveals = room.reveals.get("p0") ?? [];
    expect(reveals.map((r) => r.playerId).sort()).toEqual(["p0", "p1", "p2"]);
    expect(reveals.every((r) => r.permanent === true)).toBe(true);
    expect(room.players[1]!.skippedTurns).toBe(5);
  });
});

describe("loc-volcano amount multiplier", () => {
  it("scales only the +N and keeps the blind discard count (t3-scrap-shot)", () => {
    const { room } = startGame(2);
    room.players[1]!.hand = [skipCard(), skipCard(), skipCard()];

    const effect = getResolver("t3-scrap-shot")!({
      game: room,
      actor: "p0",
      amountMultiplier: 2,
      random: seeded(9),
    });
    expect(effect.applied).toBe(true);
    expect(room.players[1]!.hand).toHaveLength(3 + 2 - 1);
    expect(effect.log?.join(" ")).toMatch(/\+2 and discards 1 card/);
  });

  it("scales only the +N and keeps the steal count (t1-plunder)", () => {
    const { room } = startGame(2);
    room.players[1]!.hand = [
      makeColorCard("c1", "red"),
      makeColorCard("c2", "blue"),
      makeColorCard("c3", "green"),
    ];
    const actorBefore = room.players[0]!.hand.length;

    const effect = getResolver("t1-plunder")!({
      game: room,
      actor: "p0",
      targets: ["p1"],
      picked: ["c1"],
      amountMultiplier: 2,
      random: seeded(42),
    });
    expect(effect.applied).toBe(true);
    expect(room.players[0]!.hand).toHaveLength(actorBefore + 1);
    expect(room.players[1]!.hand).toHaveLength(3 + 6 - 1);
    expect(effect.log?.join(" ")).toMatch(/adds 6 cards to P1/);
    expect(effect.log?.join(" ")).toMatch(/steals 1 card/);
  });

  it("scales only the +N and keeps the discard count (t1-scrapheap)", () => {
    const { room } = startGame(3);
    room.players[1]!.hand = [
      makeColorCard("c1", "red"),
      makeColorCard("c2", "blue"),
      makeColorCard("c3", "green"),
    ];

    const effect = getResolver("t1-scrapheap")!({
      game: room,
      actor: "p0",
      targets: ["p1", "p2"],
      picked: ["c1", "c2"],
      amountMultiplier: 2,
      random: seeded(11),
    });
    expect(effect.applied).toBe(true);
    expect(effect.log?.join(" ")).toMatch(/adds 2 cards to 2 enemy player/);
    expect(effect.log?.join(" ")).toMatch(/discards 2 card/);
  });

  it("scales only the +N and keeps the skip and per-player pick bounds (t1-jack-master)", () => {
    const { room } = startGame(3);
    room.players[1]!.hand = [makeColorCard("c1", "red"), makeColorCard("c2", "blue")];
    room.players[2]!.hand = [makeColorCard("d1", "red")];

    const effect = getResolver("t1-jack-master")!({
      game: room,
      actor: "p0",
      targets: ["p1", "p2"],
      picked: ["c1", "d1"],
      amountMultiplier: 2,
      random: seeded(5),
    });
    expect(effect.applied).toBe(true);
    expect(room.players[1]!.skippedTurns).toBe(4);
    expect(room.players[2]!.skippedTurns).toBe(4);
    expect(room.players[1]!.hand).toHaveLength(2 + 8 - 1);
    expect(room.players[2]!.hand).toHaveLength(1 + 8 - 1);
    expect(effect.log?.join(" ")).toMatch(/adds 8 cards/);
    expect(effect.log?.join(" ")).toMatch(/discards 2 card/);
  });

  it("scales the redraw on loc-volcano (t3-scavenge)", () => {
    const { room } = startGame(2);
    const hand = ["red-skip-0", "blue-skip-1", "green-skip-2", "yellow-skip-3", "red-skip-4", "blue-skip-5"].map(
      (id) => ({ ...skipCard(), id }),
    );
    room.players[0]!.hand = hand;
    const picked = hand.slice(0, 2).map((card) => card.id);
    const deckBefore = room.deck.length;
    const effect = getResolver("t3-scavenge")!({
      game: room,
      actor: "p0",
      picked,
      amountMultiplier: 2,
      random: seeded(2),
    });
    expect(effect.applied).toBe(true);
    const log = effect.log?.join(" ") ?? "";
    expect(log).toMatch(/discards 2 card/);
    expect(room.players[0]!.hand).toHaveLength(8);
    expect(room.deck).toHaveLength(deckBefore - 4);
  });

  it("doubles the redraw on loc-volcano (t2-rummage)", () => {
    const { room } = startGame(2);
    room.players[0]!.hand = [skipCard(), skipCard(), skipCard()];
    const deckBefore = room.deck.length;
    const effect = getResolver("t2-rummage")!({
      game: room,
      actor: "p0",
      amountMultiplier: 2,
      random: seeded(5),
    });
    expect(effect.applied).toBe(true);
    expect(room.players[0]!.hand).toHaveLength(6);
    expect(room.deck).toHaveLength(deckBefore - 6);
    expect(effect.log?.join(" ")).toMatch(/redraws 6/);
  });

  it("doubles the draw on loc-volcano (t2-sacrificial-lamb)", () => {
    const { room } = startGame(2);
    room.players[0]!.hand = [
      skipCard(),
      {
        id: "red-draw2-0",
        name: "Draw 2",
        type: "draw2",
        color: "red",
        tags: [],
        effect: "Next player draws 2.",
        source: "test",
        status: "stable",
      },
      makeCard({ id: "s1", name: "Reverse", type: "reverse", color: "blue" }),
      makeCard({ id: "s2", name: "Draw 4", type: "draw4", color: "red" }),
    ];
    const deckBefore = room.deck.length;
    const effect = getResolver("t2-sacrificial-lamb")!({
      game: room,
      actor: "p0",
      amountMultiplier: 2,
      random: seeded(4),
    });
    expect(effect.applied).toBe(true);
    expect(room.players[0]!.hand).toHaveLength(20);
    expect(room.deck).toHaveLength(deckBefore - 20);
    expect(effect.log?.join(" ")).toMatch(/draws 20/);
  });

  it("scales the fallback draw on loc-volcano (t2-trade-sector)", () => {
    const { room } = startGame(2);
    room.players[1]!.hand = [skipCard()];
    const deckBefore = room.deck.length;
    const effect = getResolver("t2-trade-sector")!({
      game: room,
      actor: "p0",
      targets: ["p1"],
      amountMultiplier: 2,
      random: seeded(9),
    });
    expect(effect.applied).toBe(true);
    expect(room.players[1]!.hand).toHaveLength(5);
    expect(room.deck).toHaveLength(deckBefore - 4);
    expect(effect.log?.join(" ")).toMatch(/draws 4/);
  });
});

describe("wave 3 resolver batch (challenge)", () => {
  it("does not declare target or steal inputs (auto-resolved challenge)", () => {
    expect(getResolverInputs("t3-midas-touch")).toBeUndefined();
    expect(getResolverInputs("t3-flash-flood")).toBeUndefined();
    expect(getResolverInputs("t3-red-flag")).toBeUndefined();
    expect(getResolverInputs("t3-green-thumb")).toBeUndefined();
    expect(getResolverInputs("t2-force-of-will")).toEqual({ targets: { min: 1, max: 1 } });
  });

  it("makes each other player play a yellow card or draw 4 (t3-midas-touch)", () => {
    const { room } = startGame(3);
    room.players[0]!.hand = [makeColorCard("y0", "yellow"), makeColorCard("r0", "red")];
    room.players[1]!.hand = [makeColorCard("y1", "yellow")];
    room.players[2]!.hand = [makeColorCard("r2", "red")];
    const before = [0, 1, 2].map((index) => room.players[index]!.hand.length);
    const deckBefore = room.deck.length;

    const effect = getResolver("t3-midas-touch")!({
      game: room,
      actor: "p0",
      random: seeded(9),
    });
    expect(effect.applied).toBe(true);
    expect(room.players[0]!.hand).toHaveLength(before[0]!);
    expect(room.players[1]!.hand).toHaveLength(before[1]! - 1);
    expect(room.players[2]!.hand).toHaveLength(before[2]! + 4);
    expect(room.deck).toHaveLength(deckBefore - 4);
    expect(room.pile).toHaveLength(2);
    expect(room.activeColor).toBe("yellow");
    expect(effect.log?.join(" ")).toMatch(
      /1 player\(s\) played a yellow card, 1 could not and drew 4/,
    );
  });

  it("challenges only other players, not the actor (t3-flash-flood)", () => {
    const { room } = startGame(3);
    room.players[0]!.hand = [makeColorCard("b0", "blue")];
    room.players[1]!.hand = [makeColorCard("b1", "blue")];
    room.players[2]!.hand = [makeColorCard("r2", "red")];
    const before = [0, 1, 2].map((index) => room.players[index]!.hand.length);

    const effect = getResolver("t3-flash-flood")!({
      game: room,
      actor: "p0",
      random: seeded(9),
    });
    expect(effect.applied).toBe(true);
    expect(room.players[0]!.hand).toHaveLength(before[0]!);
    expect(room.players[1]!.hand).toHaveLength(before[1]! - 1);
    expect(room.players[2]!.hand).toHaveLength(before[2]! + 4);
    expect(room.activeColor).toBe("blue");
  });

  it("challenges red and green respectively (t3-red-flag, t3-green-thumb)", () => {
    const red = getResolver("t3-red-flag")!;
    const green = getResolver("t3-green-thumb")!;
    expect(red).toBeDefined();
    expect(green).toBeDefined();

    const { room } = startGame(3);
    room.players[1]!.hand = [makeColorCard("r1", "red")];
    room.players[2]!.hand = [makeColorCard("g2", "green")];
    const before2 = room.players[2]!.hand.length;
    const effect = red({ game: room, actor: "p0", random: seeded(9) });
    expect(room.players[1]!.hand.some((card) => card.id === "r1")).toBe(false);
    expect(room.players[2]!.hand).toHaveLength(before2 + 4);
    expect(effect.log?.join(" ")).toMatch(/red card/);

    const { room: room2 } = startGame(3);
    room2.players[1]!.hand = [makeColorCard("r1", "red")];
    room2.players[2]!.hand = [makeColorCard("g2", "green")];
    const before22 = room2.players[2]!.hand.length;
    const effect2 = green({ game: room2, actor: "p0", random: seeded(9) });
    expect(room2.players[1]!.hand).toHaveLength(before22 + 4);
    expect(room2.players[2]!.hand.some((card) => card.id === "g2")).toBe(false);
    expect(effect2.log?.join(" ")).toMatch(/green card/);
  });

  it("forces the picked player to play a + card (t2-force-of-will)", () => {
    const { room } = startGame(3);
    const draw2 = makeCard({ id: "d2", name: "Draw 2", type: "draw2", color: "red" });
    room.players[1]!.hand = [draw2];
    const before = room.players[1]!.hand.length;

    const effect = getResolver("t2-force-of-will")!({
      game: room,
      actor: "p0",
      targets: ["p1"],
      random: seeded(9),
    });
    expect(effect.applied).toBe(true);
    expect(room.players[1]!.hand).toHaveLength(before - 1);
    expect(room.pile).toHaveLength(2);
    expect(room.pendingDraw).toBe(2);
    expect(effect.log?.join(" ")).toMatch(/forces P1 to play Draw 2/);
  });

  it("draws 5 for the picked player when they hold no + card (t2-force-of-will)", () => {
    const { room } = startGame(3);
    room.players[1]!.hand = [makeColorCard("c1", "red")];
    const before = room.players[1]!.hand.length;
    const deckBefore = room.deck.length;

    const effect = getResolver("t2-force-of-will")!({
      game: room,
      actor: "p0",
      targets: ["p1"],
      random: seeded(9),
    });
    expect(effect.applied).toBe(true);
    expect(room.players[1]!.hand).toHaveLength(before + 5);
    expect(room.deck).toHaveLength(deckBefore - 5);
    expect(effect.log?.join(" ")).toMatch(/none held, so they draw 5/);
  });

  it("doubles the challenge penalty on loc-volcano (t3-midas-touch)", () => {
    const { room } = startGame(3);
    room.players[0]!.hand = [makeColorCard("y0", "yellow")];
    room.players[1]!.hand = [makeColorCard("y1", "yellow")];
    room.players[2]!.hand = [makeColorCard("r2", "red")];
    const before = room.players[2]!.hand.length;

    const effect = getResolver("t3-midas-touch")!({
      game: room,
      actor: "p0",
      amountMultiplier: 2,
      random: seeded(9),
    });
    expect(effect.applied).toBe(true);
    expect(room.players[2]!.hand).toHaveLength(before + 8);
    expect(effect.log?.join(" ")).toMatch(/drew 8/);
  });
});

describe("wave 4 resolver batch (timed / deferred)", () => {
  it("declares the play-condition and target inputs (t3-future-market)", () => {
    expect(getResolverInputs("t3-future-market")).toEqual({
      targets: { min: 1, max: 1, allowSelf: true },
      cost: { count: 6, match: "any", label: "6+ cards", mode: "hold" },
    });
    expect(getResolverInputs("t3-imploded-clockwork")).toBeUndefined();
    expect(getResolverInputs("t3-liquidation")).toBeUndefined();
    expect(getResolverInputs("t3-all-in")).toBeUndefined();
    expect(getResolverInputs("t3-green-tide")).toBeUndefined();
  });

  it("counts a round on every full pass around the table", () => {
    const { room } = startGame(3);
    expect(room.round).toBe(0);
    advanceTurn(room);
    expect(room.currentTurnIndex).toBe(1);
    expect(room.round).toBe(0);
    advanceTurn(room);
    expect(room.currentTurnIndex).toBe(2);
    expect(room.round).toBe(0);
    advanceTurn(room);
    expect(room.currentTurnIndex).toBe(0);
    expect(room.round).toBe(1);
  });

  it("gives 2 random cards to the target and schedules their return in 4 rounds (t3-future-market)", () => {
    const { room } = startGame(3);
    room.players[0]!.hand = [
      makeCard({ id: "a" }),
      makeCard({ id: "b" }),
      makeCard({ id: "c" }),
      makeCard({ id: "d" }),
      makeCard({ id: "e" }),
      makeCard({ id: "f" }),
      makeColorCard("g", "red"),
    ];
    const actorBefore = room.players[0]!.hand.length;
    const targetBefore = room.players[1]!.hand.length;

    const effect = getResolver("t3-future-market")!({
      game: room,
      actor: "p0",
      targets: ["p1"],
      random: seeded(9),
    });
    expect(effect.applied).toBe(true);
    expect(room.players[0]!.hand).toHaveLength(actorBefore - 2);
    expect(room.players[1]!.hand).toHaveLength(targetBefore + 2);
    expect(room.deferred).toHaveLength(1);
    const item = room.deferred[0]!;
    expect(item.kind).toBe("return-cards");
    expect(item.triggerRound).toBe(room.round + 4);
    if (item.kind === "return-cards") {
      expect(item.holderId).toBe("p1");
      expect(item.cardIds).toHaveLength(2);
    }
  });

  it("anchors the return deadline on the round the card was played, not the advanced round (t3-future-market)", () => {
    const { room } = startGame(3);
    room.players[0]!.hand = [
      makeCard({ id: "a" }),
      makeCard({ id: "b" }),
      makeCard({ id: "c" }),
      makeCard({ id: "d" }),
      makeCard({ id: "e" }),
      makeCard({ id: "f" }),
    ];
    const effect = getResolver("t3-future-market")!({
      game: room,
      actor: "p0",
      targets: ["p1"],
      roundPlayed: room.round + 1,
      random: seeded(9),
    });
    expect(effect.applied).toBe(true);
    expect(room.deferred[0]!.triggerRound).toBe(room.round + 5);
  });

  it("refuses to resolve when the actor holds fewer than 6 cards (t3-future-market)", () => {
    const { room } = startGame(3);
    room.players[0]!.hand = [
      makeColorCard("a", "red"),
      makeColorCard("b", "red"),
      makeColorCard("c", "red"),
    ];
    const before = room.players[0]!.hand.length;

    const effect = getResolver("t3-future-market")!({
      game: room,
      actor: "p0",
      targets: ["p1"],
      random: seeded(9),
    });
    expect(effect.applied).toBe(false);
    expect(room.players[0]!.hand).toHaveLength(before);
    expect(room.deferred).toHaveLength(0);
  });

  it("returns the given cards to the actor when the trigger round arrives (t3-future-market)", () => {
    const { room } = startGame(3);
    room.players[0]!.hand = [
      makeCard({ id: "a" }),
      makeCard({ id: "b" }),
      makeCard({ id: "c" }),
      makeCard({ id: "d" }),
      makeCard({ id: "e" }),
      makeCard({ id: "f" }),
    ];
    room.players[1]!.hand = [];
    getResolver("t3-future-market")!({
      game: room,
      actor: "p0",
      targets: ["p1"],
      random: seeded(9),
    });
    const given = room.players[1]!.hand.map((card) => card.id);
    expect(given).toHaveLength(2);
    const lost = given[0]!;
    room.players[1]!.hand = room.players[1]!.hand.filter((card) => card.id !== lost);

    room.round += 4;
    const logs = runDueDeferred(room, seeded(9));
    expect(room.deferred).toHaveLength(0);
    expect(room.players[1]!.hand).toHaveLength(0);
    expect(room.players[0]!.hand.some((card) => card.id === given[1]!)).toBe(true);
    expect(room.players[0]!.hand.some((card) => card.id === lost)).toBe(false);
    expect(logs.join(" ")).toMatch(/1 card\(s\) return from P1 \(1 no longer in hand\)/);
  });

  it("returns the last 3 played cards to their players (t3-imploded-clockwork)", () => {
    const { room } = startGame(3);
    const p1c = makeColorCard("p1c", "blue");
    const p2c = makeColorCard("p2c", "green");
    const p0c = makeColorCard("p0c", "yellow");
    const token = vaultToken("vault-silver");
    for (const entry of [
      { round: 0, playerId: "p1", card: p1c },
      { round: 0, playerId: "p2", card: p2c },
      { round: 1, playerId: "p0", card: p0c },
      { round: 1, playerId: "p0", card: token },
    ]) {
      room.pileLog.push(entry);
      room.pile.push(entry.card);
    }
    const pileBefore = room.pile.length;

    const effect = getResolver("t3-imploded-clockwork")!({
      game: room,
      actor: "p0",
      random: seeded(9),
    });
    expect(effect.applied).toBe(true);
    expect(room.pile).toHaveLength(pileBefore - 3);
    expect(room.players[0]!.hand.some((card) => card.id === "p0c")).toBe(true);
    expect(room.players[1]!.hand.some((card) => card.id === "p1c")).toBe(true);
    expect(room.players[2]!.hand.some((card) => card.id === "p2c")).toBe(true);
    expect(room.pile.some((card) => card.id === token.id)).toBe(true);
    expect(effect.log?.join(" ")).toMatch(/3 card\(s\) return to their players/);
  });

  it("skips the player instead of acting for 2 rounds (t3-liquidation)", () => {
    const { room } = startGame(3);
    const effect = getResolver("t3-liquidation")!({
      game: room,
      actor: "p0",
      random: seeded(9),
    });
    expect(effect.applied).toBe(true);
    expect(room.players[0]!.liquidationUntilRound).toBe(room.round + 2);

    room.currentTurnIndex = 2;
    advanceTurn(room);
    expect(room.round).toBe(1);
    expect(room.currentTurnIndex).toBe(1);

    room.currentTurnIndex = 2;
    advanceTurn(room);
    expect(room.round).toBe(2);
    expect(room.currentTurnIndex).toBe(1);

    room.currentTurnIndex = 2;
    advanceTurn(room);
    expect(room.round).toBe(3);
    expect(room.currentTurnIndex).toBe(0);
  });

  it("grants 2 Diamond Vaults and pays out +15 with a vault discard after 3 rounds (t3-all-in)", () => {
    const { room } = startGame(3);
    room.deck = room.deck.filter((card) => !isVaultTokenCard(card));
    const tokensBefore = room.players[0]!.hand.filter((card) => isVaultTokenCard(card)).length;

    const effect = getResolver("t3-all-in")!({
      game: room,
      actor: "p0",
      random: seeded(9),
    });
    expect(effect.applied).toBe(true);
    const tokensAfter = room.players[0]!.hand.filter((card) => isVaultTokenCard(card)).length;
    expect(tokensAfter).toBe(tokensBefore + 2);
    expect(room.deferred).toHaveLength(1);
    expect(room.deferred[0]!.kind).toBe("all-in");
    expect(room.deferred[0]!.triggerRound).toBe(room.round + 3);

    const handBefore = room.players[0]!.hand.length;
    room.round += 3;
    const logs = runDueDeferred(room, seeded(9));
    expect(room.deferred).toHaveLength(0);
    const tokensNow = room.players[0]!.hand.filter((card) => isVaultTokenCard(card)).length;
    expect(tokensNow).toBe(0);
    expect(room.players[0]!.hand).toHaveLength(handBefore + 20 - 2);
    expect(logs.join(" ")).toMatch(/\+20 and 2 Vault token\(s\) discarded/);
  });

  it("settles green tide after 15 rounds, drawing a third of each hand (t3-green-tide)", () => {
    const { room } = startGame(3);
    room.players[0]!.hand = Array.from({ length: 8 }, (_, i) => makeColorCard(`p0-${i}`, "red"));
    room.players[1]!.hand = Array.from({ length: 4 }, (_, i) => makeColorCard(`p1-${i}`, "blue"));
    room.players[2]!.hand = [];
    const effect = getResolver("t3-green-tide")!({
      game: room,
      actor: "p0",
      random: seeded(9),
    });
    expect(effect.applied).toBe(true);
    expect(room.deferred).toHaveLength(1);
    expect(room.deferred[0]!.kind).toBe("green-tide");
    expect(room.deferred[0]!.triggerRound).toBe(room.round + 15);

    room.round += 15;
    const logs = runDueDeferred(room, seeded(9));
    expect(room.deferred).toHaveLength(0);
    expect(room.players[0]!.hand).toHaveLength(8 + Math.ceil(8 / 3));
    expect(room.players[1]!.hand).toHaveLength(4 + Math.ceil(4 / 3));
    expect(room.players[2]!.hand).toHaveLength(0);
    expect(logs.join(" ")).toMatch(/Green Tide/);
  });

  it("fires due deferred effects automatically when a play crosses a round boundary", () => {
    const { room } = startGame(3);
    room.players[0]!.hand = [
      makeCard({ id: "a" }),
      makeCard({ id: "b" }),
      makeCard({ id: "c" }),
      makeCard({ id: "d" }),
      makeCard({ id: "e" }),
      makeCard({ id: "f" }),
    ];
    getResolver("t3-future-market")!({
      game: room,
      actor: "p0",
      targets: ["p1"],
      random: seeded(9),
    });
    const cardIds = room.deferred[0]!.kind === "return-cards" ? room.deferred[0]!.cardIds : [];
    expect(room.deferred).toHaveLength(1);
    expect(room.deferred[0]!.triggerRound).toBe(room.round + 4);

    room.activeColor = "red";
    room.currentTurnIndex = 2;
    room.players[2]!.hand = [makeColorCard("r2", "red")];
    room.round += 4;
    const outcome = playCard(room, room.players[2]!, 0);
    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.value.log.join(" ")).toMatch(/Future Market matures/);
    }
    expect(room.deferred).toHaveLength(0);
    expect(room.players[0]!.hand.some((card) => cardIds.includes(card.id))).toBe(true);
  });
});

describe("wave 5 event-driven passives", () => {
  it("registers all 14 Wave 5 passives at activation", () => {
    const activations: Array<[string, Record<string, unknown> | undefined]> = [
      ["t3-accumulation", undefined],
      ["t3-investment", undefined],
      ["t2-most-wanted", { targets: ["p1"] }],
      ["t2-parasitism", { targets: ["p1"] }],
      ["t2-cruelty", { targets: ["p1", "p2"] }],
      ["t1-tyranny", undefined],
      ["t1-equality", undefined],
      ["t1-zephyr", undefined],
      ["t1-prayers", undefined],
      ["t1-ultimate-machine-form", undefined],
      ["t1-silver-tongue", undefined],
      ["t1-maim", undefined],
      ["t1-scourge", { targets: ["p1"] }],
      ["t1-cutthroat", undefined],
    ];
    for (const [id, extra] of activations) {
      const { room } = startGame(3);
      const effect = getResolver(id)!({
        game: room,
        actor: "p0",
        random: seeded(9),
        ...extra,
      });
      expect(effect.applied).toBe(true);
      expect(room.passives.length).toBe(1);
    }
  });

  it("doubles the owner's next +2/+4 and removes itself (t3-accumulation)", () => {
    const { room } = startGame(2);
    const draw2 = makeCard({ id: "d2", name: "Draw 2", type: "draw2", color: "red" });
    const draw4 = makeCard({ id: "d4", name: "Draw 4", type: "draw4", color: "red" });

    addPassive(room, { kind: "accumulation", ownerId: "p0" });
    const first = emitGameEvent(
      room,
      { kind: "card-played", playerId: "p0", card: draw2 },
      seeded(1),
    );
    expect(room.pendingDraw).toBe(2);
    expect(first.logs.join(" ")).toMatch(/Accumulation/);
    expect(findOwnerPassive(room, "accumulation", "p0")).toBeUndefined();

    addPassive(room, { kind: "accumulation", ownerId: "p0" });
    const second = emitGameEvent(
      room,
      { kind: "card-played", playerId: "p0", card: draw4 },
      seeded(1),
    );
    expect(room.pendingDraw).toBe(6);
    expect(second.logs.join(" ")).toMatch(/Accumulation/);
    expect(findOwnerPassive(room, "accumulation", "p0")).toBeUndefined();
  });

  it("registers a pending draw offer for the owner on round advance (t3-investment)", () => {
    const { room } = startGame(3);
    const before = room.players[0]!.hand.length;
    addPassive(room, { kind: "investment", ownerId: "p0" });
    const result = emitGameEvent(room, { kind: "round-advanced", newRound: 1 }, seeded(1));
    expect(room.players[0]!.hand).toHaveLength(before); // no auto-draw
    expect(room.investmentPending.has("p0")).toBe(true);
    expect(result.logs.join(" ")).toMatch(/Investment/);
  });

  it("draws +1 for the target whenever they play blue or red (t2-most-wanted)", () => {
    const { room } = startGame(3);
    room.players[1]!.hand = [
      makeColorCard("b", "blue"),
      makeColorCard("r", "red"),
      makeColorCard("g", "green"),
    ];
    addPassive(room, { kind: "most-wanted", ownerId: "p0", targetId: "p1" });
    const blueBefore = room.players[1]!.hand.length;
    emitGameEvent(
      room,
      { kind: "card-played", playerId: "p1", card: makeColorCard("b", "blue") },
      seeded(1),
    );
    expect(room.players[1]!.hand).toHaveLength(blueBefore + 1);
    const redBefore = room.players[1]!.hand.length;
    emitGameEvent(
      room,
      { kind: "card-played", playerId: "p1", card: makeColorCard("r", "red") },
      seeded(1),
    );
    expect(room.players[1]!.hand).toHaveLength(redBefore + 1);
    const greenBefore = room.players[1]!.hand.length;
    emitGameEvent(
      room,
      { kind: "card-played", playerId: "p1", card: makeColorCard("g", "green") },
      seeded(1),
    );
    expect(room.players[1]!.hand).toHaveLength(greenBefore);
    const p0Before = room.players[1]!.hand.length;
    emitGameEvent(
      room,
      { kind: "card-played", playerId: "p0", card: makeColorCard("b", "blue") },
      seeded(1),
    );
    expect(room.players[1]!.hand).toHaveLength(p0Before);
  });

  it("discards a random card from the owner when the target plays green (t2-parasitism)", () => {
    const { room } = startGame(3);
    room.players[0]!.hand = [
      makeCard({ id: "v", name: "Vault", type: "vault-silver", color: "blue" }),
      makeCard({ id: "n9", name: "9", type: "number", color: "green", number: 9 }),
      makeCard({ id: "n1", name: "1", type: "number", color: "green", number: 1 }),
    ];
    addPassive(room, { kind: "parasitism", ownerId: "p0", targetId: "p1" });
    const green = makeCard({ id: "g", name: "5", type: "number", color: "green", number: 5 });

    const handBefore = room.players[0]!.hand.length;
    emitGameEvent(room, { kind: "card-played", playerId: "p1", card: green }, seeded(1));
    expect(room.players[0]!.hand).toHaveLength(handBefore - 1);

    emitGameEvent(
      room,
      { kind: "card-played", playerId: "p1", card: makeColorCard("r", "red") },
      seeded(1),
    );
    const afterRed = room.players[0]!.hand.length;
    emitGameEvent(room, { kind: "card-played", playerId: "p1", card: green }, seeded(1));
    expect(room.players[0]!.hand).toHaveLength(afterRed - 1);
  });

  it("blocks Cruelty victims from winning until both hold exactly 1 card (t2-cruelty)", () => {
    const { room } = startGame(3);
    addPassive(room, { kind: "cruelty", ownerId: "p0", victims: ["p1", "p2"] });
    room.players[1]!.hand = [makeColorCard("a", "red")];
    room.players[2]!.hand = [makeColorCard("b", "red"), makeColorCard("c", "blue")];

    expect(isWinAllowed(room, room.players[1]!).allowed).toBe(false);
    expect(isWinAllowed(room, room.players[2]!).allowed).toBe(false);
    expect(isWinAllowed(room, room.players[0]!).allowed).toBe(true);

    room.players[2]!.hand = [makeColorCard("b", "red")];
    const lifted = emitGameEvent(
      room,
      { kind: "card-played", playerId: "p1", card: makeColorCard("a", "red") },
      seeded(1),
    );
    expect(isWinAllowed(room, room.players[1]!).allowed).toBe(true);
    expect(findOwnerPassive(room, "cruelty", "p0")).toBeUndefined();
    expect(lifted.logs.join(" ")).toMatch(/Cruelty is lifted/);
  });

  it("blocks a card play from winning under Silver Tongue (t1-silver-tongue)", () => {
    const { room } = startGame(2);
    addPassive(room, { kind: "silver-tongue", ownerId: "p0" });
    room.players[1]!.hand = [makeColorCard("last", "red")];
    room.activeColor = "red";
    const outcome = playCard(room, room.players[1]!, 0, undefined, seeded(9));
    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.value.won).toBe(false);
      expect(outcome.value.log.join(" ")).toMatch(/Silver Tongue prevents/);
    }
    expect(room.status).toBe("ongoing");
  });

  it("passes every hand clockwise when a round advances (t1-silver-tongue)", () => {
    const { room } = startGame(3);
    room.players[0]!.hand = [makeColorCard("a", "red")];
    room.players[1]!.hand = [makeColorCard("b", "blue")];
    room.players[2]!.hand = [makeColorCard("c", "green")];
    addPassive(room, { kind: "silver-tongue", ownerId: "p0" });
    emitGameEvent(room, { kind: "round-advanced", newRound: 1 }, seeded(1));
    expect(room.players[0]!.hand[0]!.id).toBe("b");
    expect(room.players[1]!.hand[0]!.id).toBe("c");
    expect(room.players[2]!.hand[0]!.id).toBe("a");
  });

  it("skips the next player at activation and +3s anyone the owner skips (t1-tyranny)", () => {
    const { room } = startGame(3);
    const nextBefore = room.players[1]!.hand.length;
    const effect = getResolver("t1-tyranny")!({ game: room, actor: "p0", random: seeded(9) });
    expect(effect.applied).toBe(true);
    expect(room.players[1]!.skippedTurns).toBe(1);
    expect(room.players[1]!.hand).toHaveLength(nextBefore + 3);
    expect(effect.log?.join(" ")).toMatch(/Tyranny|tyranny/);

    const targetBefore = room.players[2]!.hand.length;
    applySkipTurns(room, [room.players[2]!], 1, "p0", seeded(9));
    expect(room.players[2]!.hand).toHaveLength(targetBefore + 3);
  });

  it("draws +2 for a random enemy on every even number the owner plays (t1-equality)", () => {
    const { room } = startGame(3);
    addPassive(room, { kind: "equality", ownerId: "p0" });
    const before = [1, 2].map((index) => room.players[index]!.hand.length);
    emitGameEvent(
      room,
      {
        kind: "card-played",
        playerId: "p0",
        card: makeCard({ id: "even", type: "number", number: 4 }),
      },
      seeded(1),
    );
    const added = [1, 2].map((index) => room.players[index]!.hand.length - before[index - 1]!);
    expect(added.filter((n) => n === 2)).toHaveLength(1);
    expect(added.filter((n) => n === 0)).toHaveLength(1);

    const beforeOdd = room.players[1]!.hand.length + room.players[2]!.hand.length;
    emitGameEvent(
      room,
      {
        kind: "card-played",
        playerId: "p0",
        card: makeCard({ id: "odd", type: "number", number: 3 }),
      },
      seeded(1),
    );
    expect(room.players[1]!.hand.length + room.players[2]!.hand.length).toBe(beforeOdd);
  });

  it("keeps the owner's turn for a second play and +2s all enemies on specials (t1-zephyr)", () => {
    const { room } = startGame(2);
    room.players[0]!.hand = [
      makeColorCard("n1", "red"),
      makeColorCard("n2", "red"),
      makeCard({ id: "sp", name: "Skip", type: "skip", color: "red" }),
    ];
    room.activeColor = "red";
    addPassive(room, { kind: "zephyr", ownerId: "p0", playsThisTurn: 0 });

    const enemyBefore = room.players[1]!.hand.length;
    const first = playCard(room, room.players[0]!, 0, undefined, seeded(9));
    expect(first.ok).toBe(true);
    expect(room.currentTurnIndex).toBe(0);
    const zephyr = findOwnerPassive(room, "zephyr", "p0")!;
    expect(zephyr.playsThisTurn).toBe(1);

    const second = playCard(room, room.players[0]!, 0, undefined, seeded(9));
    expect(second.ok).toBe(true);
    expect(room.currentTurnIndex).toBe(1);
    expect(zephyr.playsThisTurn).toBe(2);

    room.players[0]!.hand = [makeCard({ id: "sp2", name: "Skip", type: "skip", color: "red" })];
    const enemyBefore2 = room.players[1]!.hand.length;
    room.currentTurnIndex = 0;
    zephyr.playsThisTurn = 0;
    const special = playCard(room, room.players[0]!, 0, undefined, seeded(9));
    expect(special.ok).toBe(true);
    expect(room.players[1]!.hand).toHaveLength(enemyBefore2 + 2);
  });

  it("grants +1 to the next seat for red plays, with the Offerings/Ruin bonus (t1-prayers)", () => {
    const { room } = startGame(3);
    addPassive(room, { kind: "prayers", ownerId: "p0", bonus: 3 });
    const nextBefore = room.players[1]!.hand.length;
    emitGameEvent(
      room,
      {
        kind: "card-played",
        playerId: "p0",
        card: makeCard({ id: "red", type: "number", color: "red", number: 2 }),
      },
      seeded(1),
    );
    expect(room.players[1]!.hand).toHaveLength(nextBefore + 4);

    const p2Before = room.players[2]!.hand.length;
    emitGameEvent(
      room,
      {
        kind: "card-played",
        playerId: "p0",
        card: makeCard({ id: "blue", type: "number", color: "blue", number: 2 }),
      },
      seeded(1),
    );
    expect(room.players[2]!.hand).toHaveLength(p2Before);
  });

  it("computes the +4 bonus when Offerings and Ruin were both played first (t1-prayers)", () => {
    const { room } = startGame(3);
    room.players[0]!.playedEffectIds = ["t3-offerings", "t2-ruin"];
    const effect = getResolver("t1-prayers")!({ game: room, actor: "p0", random: seeded(1) });
    expect(effect.applied).toBe(true);
    const passive = findOwnerPassive(room, "prayers", "p0")!;
    expect(passive.bonus).toBe(4);
  });

  it("doubles draw2/draw4 for the owner (t1-ultimate-machine-form)", () => {
    const { room } = startGame(2);
    room.players[0]!.hand = [
      makeCard({ id: "d2", name: "Draw 2", type: "draw2", color: "red" }),
      makeColorCard("n", "red"),
    ];
    room.activeColor = "red";
    addPassive(room, { kind: "ultimate-machine-form", ownerId: "p0" });
    const outcome = playCard(room, room.players[0]!, 0, undefined, seeded(9));
    expect(outcome.ok).toBe(true);
    expect(room.pendingDraw).toBe(4);
  });

  it("recomputes Bleed stacks from hand size and resets after 5 (t1-maim)", () => {
    const { room } = startGame(3);
    room.players[1]!.hand = Array.from({ length: 3 }, (_, i) => makeColorCard(`p1-${i}`, "red"));
    room.players[2]!.hand = Array.from({ length: 7 }, (_, i) => makeColorCard(`p2-${i}`, "blue"));
    addPassive(room, { kind: "maim", ownerId: "p0", bleed: new Map() });
    const passive = findOwnerPassive(room, "maim", "p0")!;
    recomputeBleed(room, passive, seeded(9));
    expect(passive.bleed.get("p1")).toBe(1);
    expect(passive.bleed.get("p2")).toBe(3);

    room.players[2]!.hand = Array.from({ length: 11 }, (_, i) => makeColorCard(`p2-${i}`, "blue"));
    const result = recomputeBleed(room, passive, seeded(9));
    expect(room.players[2]!.hand).toHaveLength(11 + 20);
    expect(passive.bleed.get("p2")).toBe(0);
    expect(result.logs.join(" ")).toMatch(/5 stacks.*draw 20|draw 20/);
  });

  it("spreads the infection and +1s the infectee, +1s others (t1-scourge)", () => {
    const { room } = startGame(4);
    room.players[1]!.hand = [makeColorCard("a", "red")];
    const p2Before = room.players[2]!.hand.length;
    const p3Before = room.players[3]!.hand.length;
    addPassive(room, { kind: "scourge", ownerId: "p0", infecteeId: "p1" });
    const passive = findOwnerPassive(room, "scourge", "p0")!;
    const result = advanceScourge(room, passive, seeded(9));
    expect(room.players[1]!.hand).toHaveLength(2);
    expect(room.players[2]!.hand).toHaveLength(p2Before + 1);
    expect(room.players[3]!.hand).toHaveLength(p3Before + 1);
    expect(passive.infecteeId).toBe("p2");
    expect(result.logs.join(" ")).toMatch(/spreads to P2/);
  });

  it("spreads the infection seat-backward when play direction is reversed (t1-scourge)", () => {
    const { room } = startGame(4);
    room.currentDirection = -1;
    room.players[1]!.hand = [makeColorCard("a", "red")];
    addPassive(room, { kind: "scourge", ownerId: "p0", infecteeId: "p1" });
    const passive = findOwnerPassive(room, "scourge", "p0")!;
    const result = advanceScourge(room, passive, seeded(9));
    expect(passive.infecteeId).toBe("p3");
    expect(result.logs.join(" ")).toMatch(/spreads to P3/);
  });

  it("ends the infection when it would return to the host in a 2-player game (t1-scourge)", () => {
    const { room } = startGame(2);
    room.players[1]!.hand = [makeColorCard("a", "red")];
    addPassive(room, { kind: "scourge", ownerId: "p0", infecteeId: "p1" });
    const passive = findOwnerPassive(room, "scourge", "p0")!;
    const result = advanceScourge(room, passive, seeded(9));
    expect(findOwnerPassive(room, "scourge", "p0")).toBeUndefined();
    expect(result.logs.join(" ")).toMatch(/run its course/);
  });

  it("makes special cards unplayable while Cutthroat is active (t1-cutthroat)", () => {
    const { room } = startGame(2);
    room.activeColor = "red";
    const special = makeCard({ id: "sp", name: "Skip", type: "skip", color: "red" });
    const number = makeColorCard("num", "red");
    room.players[1]!.hand = [special, number];
    addPassive(room, { kind: "cutthroat", ownerId: "p0", startedAtRound: room.round });
    expect(isPlayable(special, room, room.players[1]!)).toBe(false);
    expect(isPlayable(number, room, room.players[1]!)).toBe(true);
    expect(isPlayable(special, room, room.players[0]!)).toBe(true);
  });

  it("removes the Deadweight when everyone's total reaches 30 (t1-cutthroat)", () => {
    const { room } = startGame(2);
    addPassive(room, { kind: "cutthroat", ownerId: "p0", startedAtRound: room.round });
    room.players[0]!.hand = Array.from({ length: 16 }, (_, i) => makeColorCard(`p0-${i}`, "red"));
    room.players[1]!.hand = Array.from({ length: 14 }, (_, i) => makeColorCard(`p1-${i}`, "blue"));
    const passive = findOwnerPassive(room, "cutthroat", "p0")!;
    const result = checkCutthroat(room, passive, seeded(9));
    expect(findOwnerPassive(room, "cutthroat", "p0")).toBeUndefined();
    expect(result.logs.join(" ")).toMatch(/reach 30/);
  });

  it("expires after 20 rounds, giving +4 per Deadweight card then discarding them (t1-cutthroat)", () => {
    const { room } = startGame(2);
    room.players[1]!.hand = [
      makeCard({ id: "sp1", name: "Skip", type: "skip", color: "red" }),
      makeCard({ id: "rev", name: "Reverse", type: "reverse", color: "blue" }),
      makeColorCard("num", "green"),
    ];
    addPassive(room, { kind: "cutthroat", ownerId: "p0", startedAtRound: room.round });
    const before = room.players[1]!.hand.length;
    room.round = room.round + 20;
    const passive = findOwnerPassive(room, "cutthroat", "p0")!;
    const result = checkCutthroat(room, passive, seeded(9));
    expect(findOwnerPassive(room, "cutthroat", "p0")).toBeUndefined();
    expect(room.players[1]!.hand).toHaveLength(before + 8 - 2);
    expect(result.logs.join(" ")).toMatch(/Deadweight/);
  });

  it("starts the 20-round deadline from the round the card was played (t1-cutthroat)", () => {
    const { room } = startGame(2);
    const effect = getResolver("t1-cutthroat")!({
      game: room,
      actor: "p0",
      roundPlayed: room.round + 1,
      random: seeded(1),
    });
    expect(effect.applied).toBe(true);
    const passive = findOwnerPassive(room, "cutthroat", "p0")!;
    expect(passive.startedAtRound).toBe(room.round + 1);
  });
});

describe("mayhem per-round re-roll", () => {
  it("rolls a fresh Mayhem event when the round advances, without repeats", () => {
    const { room } = startGame(2, 1, {
      locationId: "loc-hell-gate",
      mayhemEventId: "mayhem-1",
    });
    expect(room.round).toBe(0);
    expect(room.usedMayhemIds).toEqual(["mayhem-1"]);

    expect(applyDraw(room, seeded(1)).ok).toBe(true);
    const second = applyDraw(room, seeded(2));
    if (!second.ok) {
      throw new Error(second.error);
    }
    expect(room.round).toBe(1);
    expect(room.mayhemEventId).not.toBe("mayhem-1");
    expect(second.value.log.some((line) => line.startsWith("Mayhem begins:"))).toBe(true);

    expect(applyDraw(room, seeded(3)).ok).toBe(true);
    const fourth = applyDraw(room, seeded(4));
    if (!fourth.ok) {
      throw new Error(fourth.error);
    }
    expect(room.round).toBe(2);
    expect(room.usedMayhemIds).toHaveLength(3);
    expect(new Set(room.usedMayhemIds).size).toBe(3);
  });

  it("does not re-roll while mayhem is inactive", () => {
    const { room } = startGame(2);
    expect(room.mayhemEventId).toBeUndefined();
    expect(room.usedMayhemIds).toEqual([]);
    expect(applyDraw(room, seeded(1)).ok).toBe(true);
    expect(applyDraw(room, seeded(2)).ok).toBe(true);
    expect(room.round).toBe(1);
    expect(room.mayhemEventId).toBeUndefined();
    expect(room.usedMayhemIds).toEqual([]);
  });
});
