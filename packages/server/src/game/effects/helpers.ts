import type { Card, VaultCardType } from "@bruno/shared";
import { CARDS } from "@bruno/shared";
import type { Player, Room } from "../room.js";
import { draw as drawCards, type Rng } from "../deck.js";
import { getResolver } from "./registry.js";
import type { CostMatch, CostSpec, StealMode } from "./registry.js";
import { actorPlayer, type EffectContext } from "./types.js";

let tokenCounter = 100;

/**
 * Grants freshly-minted vault tokens of `tier` to a player's hand. Tokens are
 * granted (not drawn from the deck), so their ids use a private counter that
 * can never collide with the 9 deck tokens.
 */
export function grantVaultTokens(
  room: Room,
  player: Player,
  tier: VaultCardType,
  count: number,
  rng: Rng,
): Card[] {
  const tierName = tier === "vault-silver" ? "Silver" : tier === "vault-gold" ? "Gold" : "Diamond";
  const tokens: Card[] = [];
  for (let i = 0; i < count; i += 1) {
    tokens.push({
      id: `${tier}-token-${tokenCounter++}`,
      name: `${tierName} Vault`,
      type: tier,
      tags: ["wild"],
      effect: `Play: choose one of 5 random ${tierName} Vault effects.`,
      source: "design (vault mechanism)",
      status: "stable",
    });
  }
  player.hand.push(...tokens);
  return tokens;
}

export function otherPlayers(room: Room, playerId: string): Player[] {
  return room.players.filter((player) => player.id !== playerId);
}

/** Returns the cards in `hand` that satisfy a play-condition `CostMatch`. */
export function cardsMatching(hand: readonly Card[], match: CostMatch): Card[] {
  return hand.filter((card) => {
    if (match === "draw-plus") {
      return card.type === "draw2" || card.type === "draw4";
    }
    if (match === "special") {
      return card.type !== "number";
    }
    if (match === "any") {
      return true;
    }
    return card.color !== undefined && match.includes(card.color);
  });
}

export function countMatchingCards(hand: readonly Card[], match: CostMatch): number {
  return cardsMatching(hand, match).length;
}

/**
 * Enforces a `To play:` cost. `discard` mode (default) removes exactly `cost.count` matching
 * cards when affordable and nothing otherwise; `hold` mode only verifies the hand holds
 * `cost.count` matching cards without removing them (e.g. Future Market's "6+ cards").
 * Returns `cost.count` on success and `0` when the hand is short, so resolvers can gate on
 * `paid < cost.count` without partially discarding cards.
 */
export function payCost(player: Player, cost: CostSpec): number {
  const matching = cardsMatching(player.hand, cost.match);
  if (matching.length < cost.count) {
    return 0;
  }
  if (cost.mode === "hold") {
    return cost.count;
  }
  for (const card of matching.slice(0, cost.count)) {
    const index = player.hand.indexOf(card);
    if (index >= 0) {
      player.hand.splice(index, 1);
    }
  }
  return cost.count;
}

export function randomOf<T>(items: readonly T[], rng: Rng): T | undefined {
  if (items.length === 0) {
    return undefined;
  }
  return items[Math.floor(rng() * items.length)];
}

/**
 * Adds cards from the deck to a player's hand (reshuffling the pile when the
 * deck runs out). Returns how many cards were actually added.
 */
export function addCards(room: Room, player: Player, amount: number, rng: Rng): number {
  const cards = drawCards(room.deck, room.pile, amount, rng);
  player.hand.push(...cards);
  return cards.length;
}

/**
 * Resolves up to `count` distinct target players: explicit `targets` take
 * precedence (filtered to seated players), otherwise random others.
 */
export function resolveTargets(
  room: Room,
  actorId: string,
  targets: string[] | undefined,
  count: number,
  rng: Rng,
): Player[] {
  const pool = room.players.filter((player) => player.id !== actorId);
  if (!targets || targets.length === 0) {
    return sampleDistinct(pool, count, rng);
  }
  const chosen = targets
    .map((id) => room.getPlayer(id))
    .filter((player): player is Player => player !== undefined && player.id !== actorId);
  return sampleDistinct(chosen, count, rng);
}

export function sampleVaultOffers(tier: VaultCardType, count: number, rng: Rng): Card[] {
  return sampleDistinct(
    CARDS.filter((card) => card.type === tier && getResolver(card.id) !== undefined),
    count,
    rng,
  );
}

/**
 * Grants `viewerId` the ability to inspect the hands of `playerIds` (deduped).
 * `permanent` reveals survive until the game ends; one-shot reveals are pruned
 * when another player takes an action.
 */
export function revealHands(
  room: Room,
  viewerId: string,
  playerIds: string[],
  permanent: boolean,
): void {
  const existing = new Map((room.reveals.get(viewerId) ?? []).map((r) => [r.playerId, r]));
  for (const playerId of new Set(playerIds)) {
    const current = existing.get(playerId);
    if (current) {
      current.permanent = current.permanent || permanent;
    } else {
      existing.set(playerId, { playerId, permanent });
    }
  }
  room.reveals.set(viewerId, [...existing.values()]);
}

/**
 * Removes the actor's picked cards from their holders' hands and applies the
 * steal mode: `steal` adds them to the actor's hand, `discard` removes them,
 * `give` deals them to random players other than their holders.
 */
export function applyPicked(
  context: EffectContext,
  mode: StealMode,
): { taken: Card[]; holders: Player[] } {
  const actor = actorPlayer(context);
  const ids = context.picked ?? [];
  const taken: Card[] = [];
  const holders: Player[] = [];
  for (const id of ids) {
    const holder = context.game.players.find((player) =>
      player.hand.some((card) => card.id === id),
    );
    const index = holder?.hand.findIndex((card) => card.id === id) ?? -1;
    const card = holder?.hand[index];
    if (!holder || !card) {
      continue;
    }
    holder.hand.splice(index, 1);
    taken.push(card);
    if (!holders.includes(holder)) {
      holders.push(holder);
    }
  }
  if (mode === "steal") {
    if (actor) {
      actor.hand.push(...taken);
    }
  } else if (mode === "give") {
    const recipients = context.game.players.filter((player) => !holders.includes(player));
    for (const card of taken) {
      const recipient = randomOf(recipients, context.random);
      if (!recipient) {
        break;
      }
      recipient.hand.push(card);
    }
  }
  return { taken, holders };
}

function sampleDistinct<T>(pool: T[], count: number, rng: Rng): T[] {
  const remaining = pool.slice();
  const chosen: T[] = [];
  while (chosen.length < count && remaining.length > 0) {
    const pick = randomOf(remaining, rng);
    if (!pick) {
      break;
    }
    chosen.push(pick);
    remaining.splice(remaining.indexOf(pick), 1);
  }
  return chosen;
}
