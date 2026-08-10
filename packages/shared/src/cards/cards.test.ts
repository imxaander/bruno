import { describe, expect, it } from "vitest";
import { CARDS } from "./cards.js";
import { DEFAULT_DECK_COMPOSITION, buildBaseDeck, totalCardCount } from "./deck.js";
import { isNumberCard, isVaultCard } from "./types.js";

describe("vault card catalog", () => {
  it("has unique ids", () => {
    const ids = CARDS.map((card) => card.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("contains exactly 90 vault cards across the three tiers", () => {
    const silver = CARDS.filter((card) => card.type === "vault-silver");
    const gold = CARDS.filter((card) => card.type === "vault-gold");
    const diamond = CARDS.filter((card) => card.type === "vault-diamond");
    expect(silver.length).toBe(27);
    expect(gold.length).toBe(21);
    expect(diamond.length).toBe(42);
    expect(silver.length + gold.length + diamond.length).toBe(90);
  });

  it("only contains vault cards", () => {
    expect(CARDS.every((card) => isVaultCard(card))).toBe(true);
  });

  it("keeps the tentative tag in sync with the tentative status", () => {
    for (const card of CARDS) {
      if (card.status === "tentative") {
        expect(card.tags).toContain("tentative");
      }
      if (card.tags.includes("tentative")) {
        expect(card.status).toBe("tentative");
      }
    }
  });

  it("has no number cards (number-type invariants are for the base deck)", () => {
    for (const card of CARDS) {
      expect(isNumberCard(card)).toBe(false);
    }
  });

  it("records a page source for every card", () => {
    for (const card of CARDS) {
      expect(card.source).toMatch(/^1\.4 BRUNO\.pdf p\.\d+(-\d+)?$/);
    }
  });
});

describe("deck composition", () => {
  it("default composition yields the expected 110 cards", () => {
    expect(totalCardCount(DEFAULT_DECK_COMPOSITION)).toBe(110);
  });

  it("buildBaseDeck creates 110 unique cards", () => {
    const deck = buildBaseDeck();
    expect(deck.length).toBe(110);
    const ids = deck.map((card) => card.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("never includes vault cards in the base deck", () => {
    const deck = buildBaseDeck();
    expect(deck.every((card) => !card.type.startsWith("vault-"))).toBe(true);
  });

  it("produces the documented per-color counts", () => {
    const deck = buildBaseDeck();
    const red = deck.filter((card) => card.color === "red");
    expect(red.length).toBe(10 + 5 + 5 + 5);
    expect(deck.filter((card) => card.type === "draw4").length).toBe(10);
  });
});
