import { isVaultTokenCard } from "@bruno/shared";
import type { Rng } from "../deck.js";
import type { DeferredEffect, Player, Room } from "../room.js";
import { addCards } from "./helpers.js";

let deferredCounter = 0;

/** A `DeferredEffect` without its generated id. */
export type DeferredEffectInput =
  | {
      kind: "return-cards";
      triggerRound: number;
      actorId: string;
      cardIds: string[];
      holderId: string;
    }
  | { kind: "all-in"; triggerRound: number; actorId: string }
  | { kind: "green-tide"; triggerRound: number };

/** Schedules a round-delayed effect on `room`. Returns the stored item. */
export function scheduleDeferred(room: Room, item: DeferredEffectInput): DeferredEffect {
  const stored = { ...item, id: `deferred-${deferredCounter++}` } as DeferredEffect;
  room.deferred.push(stored);
  return stored;
}

/**
 * Settles every deferred effect whose `triggerRound` has been reached (in play order),
 * removing it from the room. Returns human-readable log lines for the game log.
 */
export function runDueDeferred(room: Room, rng: Rng): string[] {
  const logs: string[] = [];
  const pending: DeferredEffect[] = [];
  for (const item of room.deferred) {
    if (item.triggerRound > room.round) {
      pending.push(item);
      continue;
    }
    if (item.kind === "return-cards") {
      logs.push(...settleReturnCards(room, item));
    } else if (item.kind === "all-in") {
      logs.push(...settleAllIn(room, item, rng));
    } else if (item.kind === "green-tide") {
      logs.push(...settleGreenTide(room, rng));
    }
  }
  room.deferred = pending;
  return logs;
}

/** t3-future-market: give the actor back the cards the target still holds. */
function settleReturnCards(
  room: Room,
  item: Extract<DeferredEffect, { kind: "return-cards" }>,
): string[] {
  const holder = room.getPlayer(item.holderId);
  const actor = room.getPlayer(item.actorId);
  if (!holder || !actor) {
    return [];
  }
  let returned = 0;
  for (const id of item.cardIds) {
    const index = holder.hand.findIndex((card) => card.id === id);
    if (index < 0) {
      continue;
    }
    const [card] = holder.hand.splice(index, 1);
    if (card) {
      actor.hand.push(card);
      returned += 1;
    }
  }
  const lost = item.cardIds.length - returned;
  return [
    `${actor.name}'s Future Market matures: ${returned} card(s) return from ${holder.name}${
      lost > 0 ? ` (${lost} no longer in hand)` : ""
    }.`,
  ];
}

/** t3-all-in: +15 to the actor, then discard all of their vault tokens. */
function settleAllIn(
  room: Room,
  item: Extract<DeferredEffect, { kind: "all-in" }>,
  rng: Rng,
): string[] {
  const actor = room.getPlayer(item.actorId);
  if (!actor) {
    return [];
  }
  const added = addCards(room, actor, 15, rng);
  const vaultsBefore = countVaultTokens(actor);
  actor.hand = actor.hand.filter((card) => !isVaultTokenCard(card));
  const discarded = vaultsBefore - countVaultTokens(actor);
  return [`${actor.name}'s All In pays out: +${added} and ${discarded} Vault token(s) discarded.`];
}

/** t3-green-tide: every player draws a third of their hand (double, then /1.5). */
function settleGreenTide(room: Room, rng: Rng): string[] {
  const logs: string[] = [];
  for (const player of room.players) {
    const amount = Math.ceil(player.hand.length / 3);
    const drawn = addCards(room, player, amount, rng);
    logs.push(`${player.name} draws ${drawn} card(s) as the Green Tide rolls in.`);
  }
  return logs;
}

function countVaultTokens(player: Player): number {
  return player.hand.filter((card) => isVaultTokenCard(card)).length;
}
