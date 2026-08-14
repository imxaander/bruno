import { describe, expect, it } from "vitest";
import { calculatePointChanges } from "./types.js";

function player(overrides: Partial<Parameters<typeof calculatePointChanges>[0][number]> = {}) {
  return {
    uid: "u1",
    isWinner: false,
    cardsRemaining: 7,
    vaultCardsUsed: 0,
    currentPoints: 100,
    ...overrides,
  };
}

describe("calculatePointChanges", () => {
  it("awards the winner +5 base plus +1 per vault card, capped at +10", () => {
    const changes = calculatePointChanges([
      player({ uid: "winner", isWinner: true, vaultCardsUsed: 2 }),
      player({ uid: "loser", cardsRemaining: 6 }),
    ]);
    const winner = changes.find((c) => c.uid === "winner")!;
    expect(winner.delta).toBe(7);
    expect(winner.newPoints).toBe(winner.oldPoints + 7);
  });

  it("caps the winner bonus at +10 even with many vault cards", () => {
    const changes = calculatePointChanges([
      player({ uid: "winner", isWinner: true, vaultCardsUsed: 9 }),
      player({ uid: "loser", cardsRemaining: 6 }),
    ]);
    expect(changes.find((c) => c.uid === "winner")!.delta).toBe(10);
  });

  it("gives +3 to the loser with the fewest cards and −5 to the loser with the most", () => {
    const changes = calculatePointChanges([
      player({ uid: "winner", isWinner: true, vaultCardsUsed: 0 }),
      player({ uid: "best-loser", cardsRemaining: 3 }),
      player({ uid: "mid-loser", cardsRemaining: 7 }),
      player({ uid: "worst-loser", cardsRemaining: 11 }),
    ]);
    const byUid = Object.fromEntries(changes.map((c) => [c.uid, c.delta]));
    expect(byUid["best-loser"]).toBe(3);
    expect(byUid["mid-loser"]).toBe(0);
    expect(byUid["worst-loser"]).toBe(-5);
  });

  it("does not award +3/−5 when there is only one loser", () => {
    const changes = calculatePointChanges([
      player({ uid: "winner", isWinner: true, vaultCardsUsed: 1 }),
      player({ uid: "only-loser", cardsRemaining: 9 }),
    ]);
    expect(changes.find((c) => c.uid === "only-loser")!.delta).toBe(0);
  });

  it("skips guests (uid === null)", () => {
    const changes = calculatePointChanges([
      player({ uid: null, isWinner: true, vaultCardsUsed: 0 }),
      player({ uid: "signed-in", cardsRemaining: 5 }),
    ]);
    expect(changes.every((c) => c.uid !== null)).toBe(true);
    expect(changes.map((c) => c.uid)).toEqual(["signed-in"]);
  });

  it("never lets points drop below zero", () => {
    const changes = calculatePointChanges([
      player({ uid: "winner", isWinner: true, vaultCardsUsed: 0 }),
      player({ uid: "ok-loser", cardsRemaining: 4 }),
      player({ uid: "poor", cardsRemaining: 12, currentPoints: 2 }),
    ]);
    expect(changes.find((c) => c.uid === "poor")!.newPoints).toBe(0);
  });

  it("tracks the tier transition for a rank-up", () => {
    const changes = calculatePointChanges([
      player({ uid: "winner", isWinner: true, vaultCardsUsed: 0, currentPoints: 46 }),
      player({ uid: "loser", cardsRemaining: 6 }),
    ]);
    const winner = changes.find((c) => c.uid === "winner")!;
    expect(winner.oldTier).toBe("Bronze 3");
    expect(winner.newTier).toBe("Bronze 2");
  });
});
