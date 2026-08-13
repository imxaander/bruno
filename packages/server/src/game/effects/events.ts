import type { Card } from "@bruno/shared";
import type { Rng } from "../deck.js";
import type { PassiveState, Player, Room } from "../room.js";
import { addCards, otherPlayers, randomOf } from "./helpers.js";

/**
 * Game events that always-on passives (Wave 5) react to. The engine emits these from
 * `playCard` / `applyDraw` (see `engine.ts`); `emitGameEvent` settles every registered
 * passive that cares.
 */
export type GameEvent =
  | { kind: "card-played"; playerId: string; card: Card }
  | { kind: "player-skipped"; causePlayerId: string; targetId: string }
  | { kind: "draw"; playerId: string; count: number }
  | { kind: "round-advanced"; newRound: number };

export interface EventResult {
  logs: string[];
  /** t1-zephyr sets this when the owner still has a second play left this turn. */
  keepTurn: boolean;
}

// ---- passive registry helpers ----

export function addPassive(room: Room, passive: PassiveState): void {
  room.passives.push(passive);
}

export function removePassive(room: Room, kind: PassiveState["kind"], ownerId: string): void {
  room.passives = room.passives.filter((p) => !(p.kind === kind && p.ownerId === ownerId));
}

export function findPassive<K extends PassiveState["kind"]>(
  room: Room,
  kind: K,
): Extract<PassiveState, { kind: K }>[] {
  return room.passives.filter((p): p is Extract<PassiveState, { kind: K }> => p.kind === kind);
}

export function findOwnerPassive<K extends PassiveState["kind"]>(
  room: Room,
  kind: K,
  ownerId: string,
): Extract<PassiveState, { kind: K }> | undefined {
  return room.passives.find(
    (p): p is Extract<PassiveState, { kind: K }> => p.kind === kind && p.ownerId === ownerId,
  );
}

export function hasPassive(room: Room, kind: PassiveState["kind"], ownerId: string): boolean {
  return room.passives.some((p) => p.kind === kind && p.ownerId === ownerId);
}

// ---- skip application (fires player-skipped events) ----

/** Marks `players` skipped for `turns` and emits a `player-skipped` event per target. */
export function applySkipTurns(
  room: Room,
  players: Player[],
  turns: number,
  causePlayerId: string,
  rng: Rng,
): string[] {
  const logs: string[] = [];
  for (const target of players) {
    target.skippedTurns = (target.skippedTurns ?? 0) + turns;
    const result = emitGameEvent(
      room,
      { kind: "player-skipped", causePlayerId, targetId: target.id },
      rng,
    );
    logs.push(...result.logs);
  }
  return logs;
}

// ---- win blocking (consulted by the engine's win check) ----

/**
 * Whether `player` may win by emptying their hand. Blocked by Cruelty (a marked victim
 * whose co-victim isn't at exactly 1 card) and by Silver Tongue (any player while the
 * owner is still in the game — the owner themselves can still win normally).
 */
export function isWinAllowed(room: Room, player: Player): { allowed: boolean; reason?: string } {
  for (const passive of room.passives) {
    if (passive.kind === "cruelty" && passive.victims.includes(player.id)) {
      const victims = passive.victims.map((id) => room.getPlayer(id));
      const allAtOne = victims.every((victim) => victim && victim.hand.length === 1);
      if (!allAtOne) {
        return {
          allowed: false,
          reason: `${player.name} is held back by Cruelty and cannot win yet.`,
        };
      }
    }
    if (passive.kind === "silver-tongue" && passive.ownerId !== player.id) {
      const owner = room.getPlayer(passive.ownerId);
      if (owner) {
        return {
          allowed: false,
          reason: `${owner.name}'s Silver Tongue prevents ${player.name} from playing their last card.`,
        };
      }
    }
  }
  return { allowed: true };
}

// ---- dispatch ----

/** Settles every registered passive against a game event. Returns logs (+ keepTurn for zephyr). */
export function emitGameEvent(room: Room, event: GameEvent, rng: Rng): EventResult {
  const result: EventResult = { logs: [], keepTurn: false };
  for (const passive of room.passives.slice()) {
    const settled = handlePassive(room, passive, event, rng);
    result.logs.push(...settled.logs);
    result.keepTurn = result.keepTurn || (settled.keepTurn ?? false);
  }
  return result;
}

type HandlerResult = { logs: string[]; keepTurn?: boolean };

function handlePassive(
  room: Room,
  passive: PassiveState,
  event: GameEvent,
  rng: Rng,
): HandlerResult {
  switch (passive.kind) {
    case "accumulation":
      return handleAccumulation(room, passive, event);
    case "investment":
      return event.kind === "round-advanced" ? handleInvestment(room, passive, rng) : { logs: [] };
    case "most-wanted":
      return event.kind === "card-played"
        ? handleMostWanted(room, passive, event.card, event.playerId, rng)
        : { logs: [] };
    case "parasitism":
      return event.kind === "card-played"
        ? handleParasitism(room, passive, event.card, event.playerId)
        : { logs: [] };
    case "cruelty":
      return handleCruelty(room, passive);
    case "tyranny":
      return event.kind === "player-skipped"
        ? handleTyranny(room, passive, event, rng)
        : { logs: [] };
    case "equality":
      return event.kind === "card-played"
        ? handleEquality(room, passive, event.card, event.playerId, rng)
        : { logs: [] };
    case "zephyr":
      return event.kind === "card-played"
        ? handleZephyr(room, passive, event.card, event.playerId, rng)
        : { logs: [] };
    case "prayers":
      return event.kind === "card-played"
        ? handlePrayers(room, passive, event.card, event.playerId, rng)
        : { logs: [] };
    case "ultimate-machine-form":
      return { logs: [] };
    case "silver-tongue":
      return event.kind === "round-advanced" ? handleSilverTongue(room, passive) : { logs: [] };
    case "maim":
      return event.kind === "draw" ||
        event.kind === "card-played" ||
        event.kind === "round-advanced"
        ? recomputeBleed(room, passive, rng)
        : { logs: [] };
    case "scourge":
      return event.kind === "draw" || event.kind === "card-played"
        ? advanceScourge(room, passive, rng)
        : { logs: [] };
    case "cutthroat":
      return event.kind === "draw" ||
        event.kind === "card-played" ||
        event.kind === "round-advanced"
        ? checkCutthroat(room, passive, rng)
        : { logs: [] };
  }
}

/** t3-accumulation: "Your next + card is x2." One-shot — the owner's next draw2/draw4 doubles. */
function handleAccumulation(
  room: Room,
  passive: Extract<PassiveState, { kind: "accumulation" }>,
  event: GameEvent,
): HandlerResult {
  if (event.kind !== "card-played" || event.playerId !== passive.ownerId) {
    return { logs: [] };
  }
  if (event.card.type !== "draw2" && event.card.type !== "draw4") {
    return { logs: [] };
  }
  const extra = event.card.type === "draw4" ? 4 : 2;
  room.pendingDraw += extra;
  removePassive(room, "accumulation", passive.ownerId);
  const owner = room.getPlayer(passive.ownerId);
  return { logs: [`${owner?.name ?? "??"} doubles the +${extra} with Accumulation.`] };
}

/** t3-investment: "Each round, you may choose to draw an additional card." Auto-drawn. */
function handleInvestment(
  room: Room,
  passive: Extract<PassiveState, { kind: "investment" }>,
  rng: Rng,
): HandlerResult {
  const owner = room.getPlayer(passive.ownerId);
  if (!owner) {
    return { logs: [] };
  }
  const added = addCards(room, owner, 1, rng);
  return { logs: [`${owner.name} draws ${added} extra card(s) this round (Investment).`] };
}

/** t2-most-wanted: "that player will be +1 every time they play a blue or red card." */
function handleMostWanted(
  room: Room,
  passive: Extract<PassiveState, { kind: "most-wanted" }>,
  card: Card,
  playerId: string,
  rng: Rng,
): HandlerResult {
  if (playerId !== passive.targetId || (card.color !== "blue" && card.color !== "red")) {
    return { logs: [] };
  }
  const target = room.getPlayer(passive.targetId);
  const owner = room.getPlayer(passive.ownerId);
  if (!target) {
    return { logs: [] };
  }
  const added = addCards(room, target, 1, rng);
  return {
    logs: [
      `${target.name} plays a ${card.color} card — Most Wanted (${owner?.name ?? "??"}) makes them draw ${added}.`,
    ],
  };
}

/** t2-parasitism: "whenever they play a green card, discard a card from your hand." */
function handleParasitism(
  room: Room,
  passive: Extract<PassiveState, { kind: "parasitism" }>,
  card: Card,
  playerId: string,
): HandlerResult {
  if (playerId !== passive.targetId || card.color !== "green") {
    return { logs: [] };
  }
  const owner = room.getPlayer(passive.ownerId);
  if (!owner || owner.hand.length === 0) {
    return { logs: [] };
  }
  const discard = discardByPriority(owner.hand);
  if (!discard) {
    return { logs: [] };
  }
  owner.hand.splice(owner.hand.indexOf(discard), 1);
  const target = room.getPlayer(passive.targetId);
  return {
    logs: [
      `${target?.name ?? "??"} plays a green card — ${owner.name} discards a card (Parasitism).`,
    ],
  };
}

/** t2-cruelty: "neither can win until both of their hands are reduced to 1." */
function handleCruelty(
  room: Room,
  passive: Extract<PassiveState, { kind: "cruelty" }>,
): HandlerResult {
  const victims = passive.victims.map((id) => room.getPlayer(id));
  if (victims.length === 2 && victims.every((victim) => victim && victim.hand.length === 1)) {
    removePassive(room, "cruelty", passive.ownerId);
    return {
      logs: [
        `Cruelty is lifted — both ${victims.map((v) => v?.name).join(" and ")} hold exactly 1 card.`,
      ],
    };
  }
  return { logs: [] };
}

/** t1-tyranny: "Whenever you skip an enemy player +3 them." */
function handleTyranny(
  room: Room,
  passive: Extract<PassiveState, { kind: "tyranny" }>,
  event: Extract<GameEvent, { kind: "player-skipped" }>,
  rng: Rng,
): HandlerResult {
  if (event.causePlayerId !== passive.ownerId || event.targetId === passive.ownerId) {
    return { logs: [] };
  }
  const target = room.getPlayer(event.targetId);
  const owner = room.getPlayer(passive.ownerId);
  if (!target) {
    return { logs: [] };
  }
  const added = addCards(room, target, 3, rng);
  return {
    logs: [`${owner?.name ?? "??"} skips ${target.name} — Tyranny makes them draw ${added}.`],
  };
}

/** t1-equality: "Everytime you play an even no. card, +2 to a random enemy player." */
function handleEquality(
  room: Room,
  passive: Extract<PassiveState, { kind: "equality" }>,
  card: Card,
  playerId: string,
  rng: Rng,
): HandlerResult {
  if (playerId !== passive.ownerId || card.type !== "number" || card.number === undefined) {
    return { logs: [] };
  }
  if (card.number % 2 !== 0) {
    return { logs: [] };
  }
  const enemy = randomOf(otherPlayers(room, passive.ownerId), rng);
  const owner = room.getPlayer(passive.ownerId);
  if (!enemy) {
    return { logs: [] };
  }
  const added = addCards(room, enemy, 2, rng);
  return {
    logs: [`${owner?.name ?? "??"} plays an even card — ${enemy.name} draws ${added} (Equality).`],
  };
}

/**
 * t1-zephyr: "You can play 2 cards in your turn" (keepTurn while under 2 plays this turn) and
 * "some special cards have effects and +2 to all enemy players" (any non-number play).
 */
function handleZephyr(
  room: Room,
  passive: Extract<PassiveState, { kind: "zephyr" }>,
  card: Card,
  playerId: string,
  rng: Rng,
): HandlerResult {
  if (playerId !== passive.ownerId) {
    return { logs: [] };
  }
  passive.playsThisTurn += 1;
  const owner = room.getPlayer(passive.ownerId);
  const logs: string[] = [];
  if (card.type !== "number") {
    const enemies = otherPlayers(room, passive.ownerId);
    let added = 0;
    for (const enemy of enemies) {
      added += addCards(room, enemy, 2, rng);
    }
    logs.push(
      `${owner?.name ?? "??"} plays a special card — Zephyr adds +2 to ${enemies.length} enemy player(s).`,
    );
  }
  return { logs, keepTurn: passive.playsThisTurn < 2 };
}

/** t1-prayers: "All your red cards have +1" (+ bonus for Offerings/Ruin played before). */
function handlePrayers(
  room: Room,
  passive: Extract<PassiveState, { kind: "prayers" }>,
  card: Card,
  playerId: string,
  rng: Rng,
): HandlerResult {
  if (playerId !== passive.ownerId || card.color !== "red") {
    return { logs: [] };
  }
  const next = nextSeatPlayer(room, room.getPlayerIndex(playerId), 1);
  const owner = room.getPlayer(passive.ownerId);
  if (!next) {
    return { logs: [] };
  }
  const amount = 1 + passive.bonus;
  const added = addCards(room, next, amount, rng);
  return {
    logs: [
      `${owner?.name ?? "??"}'s red card grants ${next.name} +${added} (Prayers${passive.bonus > 0 ? ` +${passive.bonus} bonus` : ""}).`,
    ],
  };
}

/** t1-silver-tongue: "Switch everyone's hand clockwise every round." */
function handleSilverTongue(
  room: Room,
  passive: Extract<PassiveState, { kind: "silver-tongue" }>,
): HandlerResult {
  if (room.players.length < 2) {
    return { logs: [] };
  }
  const hands = room.players.map((player) => player.hand);
  room.players.forEach((player, index) => {
    player.hand = hands[(index + 1) % room.players.length] ?? [];
  });
  const owner = room.getPlayer(passive.ownerId);
  return { logs: [`${owner?.name ?? "??"}'s Silver Tongue passes every hand clockwise.`] };
}

// ---- exported per-passive state checks (also called at activation) ----

/**
 * t1-maim: recompute each enemy's Bleed from their hand size (1 stack at 3 cards, +1 per
 * 2 extra cards). At 5 stacks the enemy draws 20 and the Bleed resets. Stacks never decay.
 */
export function recomputeBleed(
  room: Room,
  passive: Extract<PassiveState, { kind: "maim" }>,
  rng: Rng,
): HandlerResult {
  const owner = room.getPlayer(passive.ownerId);
  if (!owner) {
    return { logs: [] };
  }
  const logs: string[] = [];
  for (const enemy of otherPlayers(room, passive.ownerId)) {
    const hand = enemy.hand.length;
    const stacks = hand <= 2 ? 0 : 1 + Math.floor((hand - 3) / 2);
    const previous = passive.bleed.get(enemy.id) ?? 0;
    if (stacks >= 5) {
      const added = addCards(room, enemy, 20, rng);
      passive.bleed.set(enemy.id, 0);
      logs.push(
        `${enemy.name}'s Bleed hits 5 stacks — Maim makes them draw ${added}, and the Bleed resets.`,
      );
    } else if (stacks > previous) {
      passive.bleed.set(enemy.id, stacks);
      logs.push(`${enemy.name} gains ${stacks} Bleed stack(s) (Maim).`);
    }
  }
  return { logs };
}

/**
 * t1-scourge: when the infectee reaches 1 card, +1 them and +2 the other enemies, then the
 * infection spreads to the next player after them (never the host). If it would reach the
 * host again, the infection ends.
 */
export function advanceScourge(
  room: Room,
  passive: Extract<PassiveState, { kind: "scourge" }>,
  rng: Rng,
): HandlerResult {
  const owner = room.getPlayer(passive.ownerId);
  const infectee = room.getPlayer(passive.infecteeId);
  if (!owner || !infectee || infectee.hand.length !== 1) {
    return { logs: [] };
  }
  const logs: string[] = [];
  const addedInfectee = addCards(room, infectee, 1, rng);
  logs.push(`${infectee.name} reaches 1 card — Scourge makes them draw ${addedInfectee}.`);
  const otherEnemies = otherPlayers(room, passive.ownerId).filter(
    (player) => player.id !== passive.infecteeId,
  );
  let addedOthers = 0;
  for (const enemy of otherEnemies) {
    addedOthers += addCards(room, enemy, 2, rng);
  }
  if (otherEnemies.length > 0) {
    logs.push(`...and ${otherEnemies.length} other enemy player(s) draw ${addedOthers} (Scourge).`);
  }
  const index = room.getPlayerIndex(passive.infecteeId);
  const n = room.players.length;
  let next: Player | undefined;
  for (let step = 1; step < n; step += 1) {
    const candidate = nextSeatPlayer(room, index, step);
    if (!candidate || candidate.id === passive.ownerId || candidate.id === passive.infecteeId) {
      continue;
    }
    next = candidate;
    break;
  }
  if (!next) {
    removePassive(room, "scourge", passive.ownerId);
    logs.push("The Scourge infection has run its course back to the host.");
  } else {
    passive.infecteeId = next.id;
    logs.push(`The Scourge infection spreads to ${next.name}.`);
  }
  return { logs };
}

/**
 * t1-cutthroat: ends when everyone's total cards reach 30 (Deadweight removed) or when the
 * 20-round deadline passes — then each enemy draws 4 per Deadweight card they hold and the
 * Deadweight is discarded. Deadweight = every non-number card enemies hold.
 */
export function checkCutthroat(
  room: Room,
  passive: Extract<PassiveState, { kind: "cutthroat" }>,
  rng: Rng,
): HandlerResult {
  const owner = room.getPlayer(passive.ownerId);
  if (!owner) {
    return { logs: [] };
  }
  const total = room.players.reduce((sum, player) => sum + player.hand.length, 0);
  if (total >= 30) {
    removePassive(room, "cutthroat", passive.ownerId);
    return {
      logs: [`Everyone's total cards reach 30 — ${owner.name}'s Cutthroat deadweight is removed.`],
    };
  }
  if (room.round >= passive.startedAtRound + 20) {
    const logs: string[] = [];
    for (const enemy of otherPlayers(room, passive.ownerId)) {
      const deadweight = enemy.hand.filter((card) => card.type !== "number");
      if (deadweight.length === 0) {
        continue;
      }
      const added = addCards(room, enemy, 4 * deadweight.length, rng);
      for (const card of deadweight) {
        const index = enemy.hand.indexOf(card);
        if (index >= 0) {
          enemy.hand.splice(index, 1);
        }
      }
      logs.push(
        `${enemy.name} holds ${deadweight.length} Deadweight card(s) after 20 rounds — +${added} and they are discarded (Cutthroat).`,
      );
    }
    removePassive(room, "cutthroat", passive.ownerId);
    logs.push(`${owner.name}'s Cutthroat expires.`);
    return { logs };
  }
  return { logs: [] };
}

// ---- helpers ----

function nextSeatPlayer(room: Room, fromIndex: number, steps: number): Player | undefined {
  const n = room.players.length;
  if (n === 0) {
    return undefined;
  }
  const raw = fromIndex + room.currentDirection * steps;
  const index = ((raw % n) + n) % n;
  return room.players[index];
}

/** Parasitism's discard order: numbers 9→0, switch-color, skip, reverse, +2, +4, then vaults III-I. */
function discardByPriority(hand: readonly Card[]): Card | undefined {
  if (hand.length === 0) {
    return undefined;
  }
  let best: Card | undefined;
  let bestRank = -1;
  for (const card of hand) {
    const rank = discardRank(card);
    if (rank > bestRank) {
      best = card;
      bestRank = rank;
    }
  }
  return best;
}

function discardRank(card: Card): number {
  if (card.type === "number") {
    return 200 + (card.number ?? 0);
  }
  const ranks: Record<string, number> = {
    "switch-color": 190,
    skip: 180,
    reverse: 170,
    draw2: 160,
    draw4: 150,
    "vault-silver": 140,
    "vault-gold": 130,
    "vault-diamond": 120,
  };
  return ranks[card.type] ?? 0;
}
