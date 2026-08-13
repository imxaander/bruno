import { describe, expect, it } from "vitest";
import type { Card, Color } from "@bruno/shared";
import { advanceTurn, applyDraw, isPlayable, playCard } from "./engine.js";
import { RoomManager, type RoomResult } from "./room-manager.js";
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

function makeCard(overrides: Partial<Card>): Card {
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

const red5 = (): Card =>
  makeCard({ id: "red-5", name: "5", type: "number", color: "red", number: 5 });
const green5 = (): Card =>
  makeCard({ id: "green-5", name: "5", type: "number", color: "green", number: 5 });
const redSkip = (): Card => makeCard({ id: "red-skip", name: "Skip", type: "skip", color: "red" });
const greenSkip = (): Card =>
  makeCard({ id: "green-skip", name: "Skip", type: "skip", color: "green" });
const redReverse = (): Card =>
  makeCard({ id: "red-reverse", name: "Reverse", type: "reverse", color: "red" });
const greenReverse = (): Card =>
  makeCard({ id: "green-reverse", name: "Reverse", type: "reverse", color: "green" });
const red2 = (): Card => makeCard({ id: "red-d2", name: "Draw 2", type: "draw2", color: "red" });
const green2 = (): Card =>
  makeCard({ id: "green-d2", name: "Draw 2", type: "draw2", color: "green" });
const draw4 = (): Card => makeCard({ id: "d4", name: "Draw 4", type: "draw4", tags: ["wild"] });

function startGame(playerCount: number): { manager: RoomManager; room: Room } {
  const manager = new RoomManager({
    turnManager: new TurnManager(5000, () => ({ cancel: () => {} })),
  });
  const room = value(
    manager.createRoom({ name: "T", playerId: "p0", playerName: "P0", maxPlayers: 8 }),
  );
  for (let i = 1; i < playerCount; i += 1) {
    value(manager.joinRoom(room.id, `p${i}`, `P${i}`));
  }
  value(
    manager.startGame(room.id, "p0", seeded(1), {
      locationId: null,
      mayhemEventId: null,
      originId: null,
    }),
  );
  return { manager, room };
}

function setState(room: Room, top: Card, activeColor: Color, pendingDraw = 0): void {
  room.pile = [top];
  room.activeColor = activeColor;
  room.pendingDraw = pendingDraw;
  room.currentTurnIndex = 0;
}

describe("isPlayable", () => {
  it("matches a number by active color", () => {
    const { room } = startGame(2);
    setState(room, draw4(), "red");
    expect(isPlayable(red5(), room)).toBe(true);
    expect(isPlayable(green5(), room)).toBe(false);
  });

  it("matches a number by number on a number top", () => {
    const { room } = startGame(2);
    setState(room, red5(), "red");
    expect(isPlayable(green5(), room)).toBe(true);
  });

  it("matches specials by color or symbol", () => {
    const { room } = startGame(2);
    setState(room, redSkip(), "red");
    expect(isPlayable(redSkip(), room)).toBe(true);
    expect(isPlayable(greenSkip(), room)).toBe(true);
    expect(isPlayable(redReverse(), room)).toBe(true);
    expect(isPlayable(greenReverse(), room)).toBe(false);
  });

  it("requires color match for +2 when no draw is pending", () => {
    const { room } = startGame(2);
    setState(room, red2(), "red");
    expect(isPlayable(red2(), room)).toBe(true);
    expect(isPlayable(green2(), room)).toBe(false);
  });

  it("always allows +4", () => {
    const { room } = startGame(2);
    setState(room, red5(), "red");
    expect(isPlayable(draw4(), room)).toBe(true);
  });

  it("only allows stack cards while a draw is pending", () => {
    const { room } = startGame(2);
    setState(room, red2(), "red", 2);
    expect(isPlayable(red2(), room)).toBe(true);
    expect(isPlayable(green2(), room)).toBe(true);
    expect(isPlayable(draw4(), room)).toBe(true);
    expect(isPlayable(red5(), room)).toBe(false);
    expect(isPlayable(redSkip(), room)).toBe(false);
  });

  it("treats a colorless wild top as matching any card", () => {
    const { room } = startGame(2);
    room.pile = [{ ...draw4(), type: "vault-silver", name: "Silver Vault" }];
    room.activeColor = null;
    expect(isPlayable(red5(), room)).toBe(true);
    expect(isPlayable(greenSkip(), room)).toBe(true);
    expect(isPlayable(redReverse(), room)).toBe(true);
  });
});

describe("playCard", () => {
  it("plays a number card and advances the turn", () => {
    const { room } = startGame(2);
    room.players[0]!.hand = [red5(), green5()];
    setState(room, red5(), "red");
    const result = playCard(room, room.players[0]!, 1);
    if (!result.ok) {
      throw new Error(result.error);
    }
    expect(room.players[0]!.hand).toEqual([red5()]);
    expect(room.pile).toHaveLength(2);
    expect(room.activeColor).toBe("green");
    expect(room.currentTurnIndex).toBe(1);
  });

  it("skips the next player", () => {
    const { room } = startGame(3);
    room.players[0]!.hand = [redSkip()];
    setState(room, red5(), "red");
    const result = playCard(room, room.players[0]!, 0);
    if (!result.ok) {
      throw new Error(result.error);
    }
    expect(room.currentTurnIndex).toBe(2);
  });

  it("reverse acts as a skip with 2 players", () => {
    const { room } = startGame(2);
    room.players[0]!.hand = [redReverse()];
    setState(room, red5(), "red");
    const result = playCard(room, room.players[0]!, 0);
    if (!result.ok) {
      throw new Error(result.error);
    }
    expect(room.currentTurnIndex).toBe(0);
    expect(room.currentDirection).toBe(1);
  });

  it("reverse flips direction with 3+ players", () => {
    const { room } = startGame(3);
    room.players[0]!.hand = [redReverse()];
    setState(room, red5(), "red");
    const result = playCard(room, room.players[0]!, 0);
    if (!result.ok) {
      throw new Error(result.error);
    }
    expect(room.currentDirection).toBe(-1);
    expect(room.currentTurnIndex).toBe(2);
  });

  it("starts a +2 stack and advances", () => {
    const { room } = startGame(2);
    room.players[0]!.hand = [red2()];
    setState(room, red5(), "red");
    const result = playCard(room, room.players[0]!, 0);
    if (!result.ok) {
      throw new Error(result.error);
    }
    expect(room.pendingDraw).toBe(2);
    expect(room.currentTurnIndex).toBe(1);
  });

  it("stacks +2 on a pending draw", () => {
    const { room } = startGame(2);
    room.players[0]!.hand = [green2()];
    setState(room, red2(), "red", 2);
    const result = playCard(room, room.players[0]!, 0);
    if (!result.ok) {
      throw new Error(result.error);
    }
    expect(room.pendingDraw).toBe(4);
    expect(room.activeColor).toBe("green");
  });

  it("rejects +4 without a chosen color", () => {
    const { room } = startGame(2);
    room.players[0]!.hand = [draw4()];
    setState(room, red5(), "red");
    const result = playCard(room, room.players[0]!, 0);
    if (result.ok) {
      throw new Error("expected +4 to require a color");
    }
    expect(result.error).toBe("CHOOSE_COLOR_REQUIRED");
  });

  it("plays +4 with a chosen color and stacks", () => {
    const { room } = startGame(2);
    room.players[0]!.hand = [draw4()];
    setState(room, red2(), "red", 2);
    const result = playCard(room, room.players[0]!, 0, "blue");
    if (!result.ok) {
      throw new Error(result.error);
    }
    expect(room.pendingDraw).toBe(6);
    expect(room.activeColor).toBe("blue");
    expect(room.currentTurnIndex).toBe(1);
  });

  it("rejects a card not in the hand", () => {
    const { room } = startGame(2);
    room.players[0]!.hand = [red5()];
    setState(room, red5(), "red");
    const result = playCard(room, room.players[0]!, 7);
    if (result.ok) {
      throw new Error("expected an invalid card index");
    }
    expect(result.error).toBe("INVALID_CARD");
  });

  it("rejects an unplayable card", () => {
    const { room } = startGame(2);
    room.players[0]!.hand = [green5()];
    setState(room, redSkip(), "red");
    const result = playCard(room, room.players[0]!, 0);
    if (result.ok) {
      throw new Error("expected an unplayable card");
    }
    expect(result.error).toBe("CARD_NOT_PLAYABLE");
  });

  it("records a win when the hand empties", () => {
    const { room } = startGame(2);
    room.players[0]!.hand = [red5()];
    setState(room, red5(), "red");
    const result = playCard(room, room.players[0]!, 0);
    if (!result.ok) {
      throw new Error(result.error);
    }
    expect(result.value.won).toBe(true);
    expect(room.status).toBe("concluding");
    expect(room.winnerId).toBe("p0");
  });

  it("attaches effect meta when resolving a vault token play", () => {
    const { room } = startGame(2);
    const offer = makeCard({
      id: "t3-scrap-shot",
      name: "Scrap Shot",
      type: "vault-silver",
      effect: "Hits a target for +1.",
    });
    room.pendingVault = {
      cardIndex: 0,
      playerId: "p0",
      tier: "vault-silver",
      offers: [offer],
      chosenCardId: "t3-scrap-shot",
    };
    room.players[0]!.hand = [
      makeCard({ id: "vault-silver-token-0", name: "Silver Vault", type: "vault-silver" }),
    ];
    setState(room, red5(), "red");
    const result = playCard(room, room.players[0]!, 0, undefined, seeded(9));
    if (!result.ok) {
      throw new Error(result.error);
    }
    expect(result.value.effect).toMatchObject({
      cardId: "t3-scrap-shot",
      name: "Scrap Shot",
      tier: "vault-silver",
      text: "Hits a target for +1.",
    });
    expect(result.value.effect?.lines.length).toBeGreaterThan(0);
  });

  it("keeps the turn with the actor when the vault resolver requests it", () => {
    const { room } = startGame(2);
    room.pendingVault = {
      cardIndex: 0,
      playerId: "p0",
      tier: "vault-silver",
      offers: [makeCard({ id: "t2-rummage", name: "Rummage", type: "vault-silver" })],
      chosenCardId: "t2-rummage",
    };
    room.players[0]!.hand = [
      makeCard({ id: "vault-silver-token-0", name: "Silver Vault", type: "vault-silver" }),
      red5(),
    ];
    room.pile = [redSkip()];
    room.activeColor = "red";
    room.pendingDraw = 0;
    room.currentTurnIndex = 0;
    const result = playCard(room, room.players[0]!, 0, undefined, seeded(9));
    if (!result.ok) {
      throw new Error(result.error);
    }
    expect(room.currentTurnIndex).toBe(0);
    expect(result.value.log.join(" ")).toMatch(/another turn/);
  });

  it("doubles only the +N of a Silver vault effect on loc-volcano (t3-scrap-shot)", () => {
    const { room } = startGame(2);
    room.locationId = "loc-volcano";
    room.pendingVault = {
      cardIndex: 0,
      playerId: "p0",
      tier: "vault-silver",
      offers: [
        makeCard({ id: "t3-scrap-shot", name: "Scrap Shot", type: "vault-silver", effect: "+1" }),
      ],
      chosenCardId: "t3-scrap-shot",
    };
    room.players[0]!.hand = [
      makeCard({ id: "vault-silver-token-0", name: "Silver Vault", type: "vault-silver" }),
    ];
    room.players[1]!.hand = [red5()];
    setState(room, red5(), "red");
    const result = playCard(room, room.players[0]!, 0, undefined, seeded(9));
    if (!result.ok) {
      throw new Error(result.error);
    }
    expect(room.players[1]!.hand).toHaveLength(2);
    expect(result.value.log.join(" ")).toMatch(/\+2 and discards 1 card/);
  });

  it("doubles the +N of a Gold vault effect on loc-volcano (t2-scrap-shot)", () => {
    const { room } = startGame(2);
    room.locationId = "loc-volcano";
    room.pendingVault = {
      cardIndex: 0,
      playerId: "p0",
      tier: "vault-gold",
      offers: [
        makeCard({ id: "t2-scrap-shot", name: "Scrap Shot", type: "vault-gold", effect: "+3" }),
      ],
      chosenCardId: "t2-scrap-shot",
    };
    room.players[0]!.hand = [
      makeCard({ id: "vault-gold-token-0", name: "Gold Vault", type: "vault-gold" }),
    ];
    room.players[1]!.hand = [red5(), green5(), redSkip()];
    setState(room, red5(), "red");
    const result = playCard(room, room.players[0]!, 0, undefined, seeded(9));
    if (!result.ok) {
      throw new Error(result.error);
    }
    expect(room.players[1]!.hand).toHaveLength(6);
    expect(result.value.log.join(" ")).toMatch(/\+6 and discards 3 card/);
  });

  it("does not double a Diamond vault effect on loc-volcano (t1-meiosis)", () => {
    const { room } = startGame(2);
    room.locationId = "loc-volcano";
    room.pendingVault = {
      cardIndex: 0,
      playerId: "p0",
      tier: "vault-diamond",
      offers: [
        makeCard({ id: "t1-meiosis", name: "Meiosis", type: "vault-diamond", effect: "+3" }),
      ],
      chosenCardId: "t1-meiosis",
    };
    room.players[0]!.hand = [
      makeCard({ id: "vault-diamond-token-0", name: "Diamond Vault", type: "vault-diamond" }),
    ];
    setState(room, red5(), "red");
    const result = playCard(room, room.players[0]!, 0, undefined, seeded(9));
    if (!result.ok) {
      throw new Error(result.error);
    }
    expect(room.players[1]!.hand).toHaveLength(11);
    expect(result.value.log.join(" ")).toMatch(/adds 3 cards/);
  });

  it("does not double vault effects without loc-volcano (t3-scrap-shot)", () => {
    const { room } = startGame(2);
    room.pendingVault = {
      cardIndex: 0,
      playerId: "p0",
      tier: "vault-silver",
      offers: [
        makeCard({ id: "t3-scrap-shot", name: "Scrap Shot", type: "vault-silver", effect: "+1" }),
      ],
      chosenCardId: "t3-scrap-shot",
    };
    room.players[0]!.hand = [
      makeCard({ id: "vault-silver-token-0", name: "Silver Vault", type: "vault-silver" }),
    ];
    room.players[1]!.hand = [red5()];
    setState(room, red5(), "red");
    const result = playCard(room, room.players[0]!, 0, undefined, seeded(9));
    if (!result.ok) {
      throw new Error(result.error);
    }
    expect(room.players[1]!.hand).toHaveLength(1);
    expect(result.value.log.join(" ")).toMatch(/\+1 and discards 1 card/);
  });
});

describe("advanceTurn skip-hopping", () => {
  it("hops over a player with skippedTurns and decrements the counter", () => {
    const { room } = startGame(3);
    room.players[0]!.skippedTurns = 0;
    room.players[1]!.skippedTurns = 1;
    room.players[2]!.skippedTurns = 0;
    room.currentTurnIndex = 0;
    room.currentDirection = 1;

    advanceTurn(room);

    expect(room.currentTurnIndex).toBe(2);
    expect(room.players[1]!.skippedTurns).toBe(0);
  });

  it("skips a player once per skipped turn, including the final one", () => {
    const { room } = startGame(3);
    room.players[0]!.skippedTurns = 0;
    room.players[1]!.skippedTurns = 2;
    room.players[2]!.skippedTurns = 0;
    room.currentTurnIndex = 0;
    room.currentDirection = 1;

    advanceTurn(room);
    expect(room.currentTurnIndex).toBe(2);
    expect(room.players[1]!.skippedTurns).toBe(1);

    advanceTurn(room);
    expect(room.currentTurnIndex).toBe(0);
    expect(room.players[1]!.skippedTurns).toBe(1);

    advanceTurn(room);
    expect(room.currentTurnIndex).toBe(2);
    expect(room.players[1]!.skippedTurns).toBe(0);

    advanceTurn(room);
    expect(room.currentTurnIndex).toBe(0);
    expect(room.players[1]!.skippedTurns).toBe(0);
  });

  it("handles skip-hopping in reverse direction", () => {
    const { room } = startGame(3);
    room.players[0]!.skippedTurns = 0;
    room.players[1]!.skippedTurns = 0;
    room.players[2]!.skippedTurns = 1;
    room.currentTurnIndex = 0;
    room.currentDirection = -1;

    advanceTurn(room);

    expect(room.currentTurnIndex).toBe(1);
    expect(room.players[2]!.skippedTurns).toBe(0);
  });

  it("skips a player when a Skip card is played over them", () => {
    const { room } = startGame(3);
    room.players[0]!.hand = [redSkip()];
    setState(room, red5(), "red");
    const result = playCard(room, room.players[0]!, 0);
    if (!result.ok) {
      throw new Error(result.error);
    }
    expect(room.currentTurnIndex).toBe(2);
  });

  it("stops advancing once every player has been hopped (bounded loop)", () => {
    const { room } = startGame(3);
    room.players.forEach((player) => {
      player.skippedTurns = 5;
    });
    room.currentTurnIndex = 0;
    room.currentDirection = 1;

    advanceTurn(room);

    expect(room.players.every((player) => player.skippedTurns === 4)).toBe(true);
  });
});

describe("applyDraw", () => {
  it("draws 1 card on a plain timeout", () => {
    const { room } = startGame(2);
    const before = room.players[0]!.hand.length;
    setState(room, red5(), "red");
    const result = applyDraw(room, seeded(2));
    if (!result.ok) {
      throw new Error(result.error);
    }
    expect(result.value.drawn).toBe(1);
    expect(room.players[0]!.hand).toHaveLength(before + 1);
    expect(room.pendingDraw).toBe(0);
    expect(room.currentTurnIndex).toBe(1);
  });

  it("draws the pending stack total", () => {
    const { room } = startGame(2);
    setState(room, red2(), "red", 6);
    const result = applyDraw(room, seeded(3));
    if (!result.ok) {
      throw new Error(result.error);
    }
    expect(result.value.drawn).toBe(6);
    expect(room.pendingDraw).toBe(0);
  });
});
