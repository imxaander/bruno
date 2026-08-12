import { describe, expect, it } from "vitest";
import type { Card, VaultCardType } from "@bruno/shared";
import { CARDS, isVaultTokenCard } from "@bruno/shared";
import { isPlayable, playCard } from "./engine.js";
import {
  getResolver,
  getResolverInputs,
  grantVaultTokens,
  registeredResolverIds,
  sampleVaultOffers,
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
  value(manager.startGame(room.id, "p0", seeded(seed)));
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

  it("returns fewer than the requested count when the tier has fewer implemented effects", () => {
    const implemented = CARDS.filter(
      (card) => card.type === "vault-diamond" && getResolver(card.id) !== undefined,
    );
    expect(implemented.length).toBeLessThan(5);
    const offers = sampleVaultOffers("vault-diamond", 5, seeded(42));
    expect(offers).toHaveLength(implemented.length);
    expect(new Set(offers.map((card) => card.id)).size).toBe(implemented.length);
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
    const implemented = CARDS.filter(
      (card) => card.type === "vault-diamond" && getResolver(card.id) !== undefined,
    );
    expect(room.pendingVault).toMatchObject({
      cardIndex: 0,
      playerId: "p0",
      tier: "vault-diamond",
    });
    expect(room.pendingVault?.offers).toHaveLength(implemented.length);
    expect(room.pendingVault?.offers.every((card) => card.type === "vault-diamond")).toBe(true);
    expect(room.pendingVault?.offers.every((card) => getResolver(card.id) !== undefined)).toBe(
      true,
    );
    expect(new Set(room.pendingVault?.offers.map((card) => card.id)).size).toBe(implemented.length);
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
    expect(result.error).toBe("INVALID_ACTION");
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
    expect(result.error).toBe("INVALID_ACTION");
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
