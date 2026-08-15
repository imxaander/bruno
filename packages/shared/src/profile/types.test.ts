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

  it("gives +3 to the best loser, −5 to the worst, and interpolates the middle pack from +2 to −4", () => {
    const changes = calculatePointChanges([
      player({ uid: "winner", isWinner: true, vaultCardsUsed: 0 }),
      player({ uid: "best-loser", cardsRemaining: 3 }),
      player({ uid: "mid-loser", cardsRemaining: 7 }),
      player({ uid: "worst-loser", cardsRemaining: 11 }),
    ]);
    const byUid = Object.fromEntries(changes.map((c) => [c.uid, c.delta]));
    expect(byUid["best-loser"]).toBe(3);
    // (7 - 3) / (11 - 3) = 0.5 → round(2 − 3) = −1
    expect(byUid["mid-loser"]).toBe(-1);
    expect(byUid["worst-loser"]).toBe(-5);
  });

  it("scales middle-pack points between +2 and −4 by cards left", () => {
    const changes = calculatePointChanges([
      player({ uid: "winner", isWinner: true, vaultCardsUsed: 0 }),
      player({ uid: "best", cardsRemaining: 2 }),
      player({ uid: "near-best", cardsRemaining: 4 }),
      player({ uid: "near-worst", cardsRemaining: 10 }),
      player({ uid: "worst", cardsRemaining: 12 }),
    ]);
    const byUid = Object.fromEntries(changes.map((c) => [c.uid, c.delta]));
    // spread = 10, t values: 0.2 and 0.8 → round(2 − 1.2) = 1, round(2 − 4.8) = −3
    expect(byUid["best"]).toBe(3);
    expect(byUid["near-best"]).toBe(1);
    expect(byUid["near-worst"]).toBe(-3);
    expect(byUid["worst"]).toBe(-5);
    for (const uid of ["best", "near-best", "near-worst", "worst"]) {
      expect(byUid[uid]).toBeGreaterThanOrEqual(-5);
      expect(byUid[uid]).toBeLessThanOrEqual(3);
    }
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
