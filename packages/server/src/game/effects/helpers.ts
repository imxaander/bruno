import type { Card, VaultCardType } from "@bruno/shared";
import { CARDS } from "@bruno/shared";
import type { Player, Room } from "../room.js";
import { draw as drawCards, type Rng } from "../deck.js";

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
    CARDS.filter((card) => card.type === tier),
    count,
    rng,
  );
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
