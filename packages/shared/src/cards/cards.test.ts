import { describe, expect, it } from "vitest";
import { CARDS } from "./cards.js";
import { DEFAULT_DECK_COMPOSITION, buildBaseDeck, totalCardCount } from "./deck.js";
import { getMayhemEvent, MAYHEM_EVENTS } from "./mayhem.js";
import { isNumberCard, isVaultCard, isVaultTokenCard } from "./types.js";

describe("card catalog", () => {
  it("has unique ids", () => {
    const ids = CARDS.map((card) => card.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("contains the documented families with the documented counts", () => {
    const silver = CARDS.filter((card) => card.type === "vault-silver");
    const gold = CARDS.filter((card) => card.type === "vault-gold");
    const diamond = CARDS.filter((card) => card.type === "vault-diamond");
    const locations = CARDS.filter((card) => card.type === "location");
    const origins = CARDS.filter((card) => card.type === "origin");
    const artifacts = CARDS.filter((card) => card.type === "artifact");
    expect(silver.length).toBe(27);
    expect(gold.length).toBe(21);
    expect(diamond.length).toBe(42);
    expect(locations.map((card) => card.id)).toEqual([
      "loc-fields",
      "loc-silver-prairie",
      "loc-desert",
      "loc-scorched-earth",
      "loc-ocean",
      "loc-abyssal-depths",
      "loc-volcano",
      "loc-hell-gate",
    ]);
    expect(origins.map((card) => card.id)).toEqual([
      "origin-vault-keeper",
      "origin-technomancer",
      "origin-grand-architect",
      "origin-masterchef",
      "origin-fateweaver",
    ]);
    expect(artifacts.map((card) => card.id)).toEqual(["artifact-boot", "artifact-leg"]);
  });

  it("contains no base-deck card types", () => {
    const baseTypes = ["number", "skip", "reverse", "draw2", "draw4", "switch-color", "shuffle"];
    expect(CARDS.every((card) => !baseTypes.includes(card.type))).toBe(true);
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

describe("mayhem data", () => {
  it("contains the nine documented events with unique ids", () => {
    expect(MAYHEM_EVENTS).toHaveLength(9);
    const ids = MAYHEM_EVENTS.map((event) => event.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("looks up events by id", () => {
    expect(getMayhemEvent("mayhem-1")).toMatchObject({ name: "Random +1" });
    expect(getMayhemEvent("mayhem-9")).toMatchObject({ name: "Reduce All to One" });
    expect(getMayhemEvent("mayhem-42")).toBeUndefined();
  });
});

describe("deck composition", () => {
  it("default composition yields the expected 119 cards (110 base + 9 vault tokens)", () => {
    expect(totalCardCount(DEFAULT_DECK_COMPOSITION)).toBe(119);
  });

  it("buildBaseDeck creates 119 unique cards", () => {
    const deck = buildBaseDeck();
    expect(deck.length).toBe(119);
    const ids = deck.map((card) => card.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("includes vault tokens (5 silver / 3 gold / 1 diamond), never catalog vault cards", () => {
    const deck = buildBaseDeck();
    const tokens = deck.filter((card) => isVaultTokenCard(card));
    expect(tokens).toHaveLength(9);
    expect(tokens.filter((card) => card.type === "vault-silver")).toHaveLength(5);
    expect(tokens.filter((card) => card.type === "vault-gold")).toHaveLength(3);
    expect(tokens.filter((card) => card.type === "vault-diamond")).toHaveLength(1);
    for (const token of tokens) {
      expect(token.name).toMatch(/Vault$/);
      expect(token.effect).toMatch(/choose one of 5 random/);
    }
    const catalogVaultIds = new Set(
      CARDS.filter((card) => isVaultCard(card)).map((card) => card.id),
    );
    for (const card of deck) {
      expect(catalogVaultIds.has(card.id)).toBe(false);
    }
  });

  it("treats catalog vault cards as offer-pool effects, not deck cards", () => {
    const catalogVaults = CARDS.filter((card) => isVaultCard(card));
    expect(catalogVaults).toHaveLength(90);
    expect(catalogVaults.every((card) => !isVaultTokenCard(card))).toBe(true);
  });

  it("produces the documented per-color counts", () => {
    const deck = buildBaseDeck();
    const red = deck.filter((card) => card.color === "red");
    expect(red.length).toBe(10 + 5 + 5 + 5);
    expect(deck.filter((card) => card.type === "draw4").length).toBe(10);
  });
});
