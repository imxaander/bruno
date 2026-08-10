import { describe, expect, it } from "vitest";
import { buildBaseDeck, DEFAULT_DECK_COMPOSITION, type Card } from "@bruno/shared";
import { buildDeck, dealHands, draw, seedPile, shuffle } from "./deck.js";

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

describe("deck", () => {
  it("builds the full 119-card deck (110 base + 9 vault tokens)", () => {
    expect(buildBaseDeck(DEFAULT_DECK_COMPOSITION)).toHaveLength(119);
  });

  it("shuffles deterministically with a seeded rng", () => {
    const a = shuffle(buildBaseDeck(DEFAULT_DECK_COMPOSITION), seeded(42));
    const b = shuffle(buildBaseDeck(DEFAULT_DECK_COMPOSITION), seeded(42));
    expect(a.map((card) => card.id)).toEqual(b.map((card) => card.id));
  });

  it("produces different orders with different seeds", () => {
    const a = shuffle(buildBaseDeck(DEFAULT_DECK_COMPOSITION), seeded(1));
    const b = shuffle(buildBaseDeck(DEFAULT_DECK_COMPOSITION), seeded(2));
    expect(a.map((card) => card.id)).not.toEqual(b.map((card) => card.id));
  });

  it("preserves card identity through a shuffle", () => {
    const shuffled = shuffle(buildBaseDeck(DEFAULT_DECK_COMPOSITION), seeded(7));
    const ids = new Set(shuffled.map((card) => card.id));
    expect(ids.size).toBe(119);
  });

  it("deals 8 cards to each player and consumes only those cards", () => {
    const deck = buildDeck(seeded(3));
    const hands = dealHands(deck, 4, 8);
    expect(hands).toHaveLength(4);
    for (const hand of hands) {
      expect(hand).toHaveLength(8);
    }
    expect(deck).toHaveLength(119 - 32);
  });

  it("seeds the pile from the deck", () => {
    const deck = buildDeck(seeded(4));
    const pile: Card[] = [];
    const top = seedPile(deck, pile);
    expect(top).toBeDefined();
    expect(pile).toHaveLength(1);
    expect(pile[0]).toBe(top);
    expect(deck).toHaveLength(118);
  });

  it("draws cards from the end of the deck", () => {
    const deck = buildDeck(seeded(5));
    const pile: Card[] = [];
    const drawn = draw(deck, pile, 2);
    expect(drawn).toHaveLength(2);
    expect(deck).toHaveLength(117);
  });

  it("reshuffles the pile (minus top) when the deck runs out", () => {
    const deck = buildDeck(seeded(6));
    const pile: Card[] = [];
    seedPile(deck, pile);
    for (let i = 0; i < 118; i += 1) {
      pile.push(deck.pop()!);
    }
    expect(deck).toHaveLength(0);
    expect(pile).toHaveLength(119);
    const pileTop = pile[pile.length - 1];

    const drawn = draw(deck, pile, 3, seeded(7));
    expect(drawn).toHaveLength(3);
    expect(deck).toHaveLength(115);
    expect(pile).toHaveLength(1);
    expect(pile[0]).toBe(pileTop);
  });

  it("draws fewer cards than asked when nothing can be drawn", () => {
    const deck: Card[] = [];
    const pile: Card[] = [buildBaseDeck(DEFAULT_DECK_COMPOSITION)[0]!];
    const drawn = draw(deck, pile, 4);
    expect(drawn).toHaveLength(0);
  });
});
