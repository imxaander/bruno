import type { Card, Color } from "@bruno/shared";
import { isVaultCard, isVaultTokenCard } from "@bruno/shared";
import type { VaultCardType } from "@bruno/shared";
import { draw as drawCards, type Rng } from "./deck.js";
import { getResolver } from "./effects/index.js";
import type { Player, Room } from "./room.js";

export type EngineError =
  | "NOT_YOUR_TURN"
  | "INVALID_CARD"
  | "CARD_NOT_PLAYABLE"
  | "CHOOSE_COLOR_REQUIRED"
  | "GAME_NOT_ACTIVE"
  | "DRAW_NOT_ALLOWED"
  | "INVALID_ACTION";

export type EngineResult<T> = { ok: true; value: T } | { ok: false; error: EngineError };

export interface PlayOutcome {
  log: string[];
  won: boolean;
  effect?: {
    cardId: string;
    name: string;
    tier: VaultCardType;
    text: string;
    lines: string[];
  };
}

export interface DrawOutcome {
  log: string[];
  drawn: number;
}

export function pileTop(room: Room): Card | undefined {
  return room.pile.length > 0 ? room.pile[room.pile.length - 1] : undefined;
}

function isSymbolMatch(card: Card, top: Card | undefined): boolean {
  if (!top) {
    return false;
  }
  if (card.type === "skip" || card.type === "reverse") {
    return card.type === top.type;
  }
  if (card.type === "number") {
    return card.number !== undefined && card.number === top.number;
  }
  return false;
}

export function isPlayable(card: Card, room: Room): boolean {
  if (card.type === "draw4") {
    return true;
  }
  if (room.pendingDraw > 0) {
    return card.type === "draw2";
  }
  if (isVaultCard(card)) {
    return true;
  }
  if (!room.activeColor) {
    return false;
  }
  if (card.color === room.activeColor) {
    return true;
  }
  return isSymbolMatch(card, pileTop(room));
}

export function hasPlayableCard(
  room: Room,
  player: Player,
  options: { countVaults?: boolean } = {},
): boolean {
  const countVaults = options.countVaults ?? true;
  return player.hand.some((card) => {
    if (!countVaults && isVaultCard(card)) {
      return false;
    }
    return isPlayable(card, room);
  });
}

export function nextIndex(room: Room, steps = 1): number {
  const n = room.players.length;
  if (n === 0) {
    return 0;
  }
  const raw = room.currentTurnIndex + room.currentDirection * steps;
  return ((raw % n) + n) % n;
}

export function advanceTurn(room: Room, steps = 1): void {
  room.currentTurnIndex = nextIndex(room, steps);
}

export function playCard(
  room: Room,
  player: Player,
  cardIndex: number,
  chosenColor?: Color,
  rng: Rng = Math.random,
): EngineResult<PlayOutcome> {
  const card = player.hand[cardIndex];
  if (!card) {
    return { ok: false, error: "INVALID_CARD" };
  }
  if (card.type === "draw4" && !chosenColor) {
    return { ok: false, error: "CHOOSE_COLOR_REQUIRED" };
  }
  if (!isPlayable(card, room)) {
    return { ok: false, error: "CARD_NOT_PLAYABLE" };
  }

  player.hand.splice(cardIndex, 1);
  room.pile.push(card);
  const log: string[] = [];
  let effect: PlayOutcome["effect"] | undefined;

  switch (card.type) {
    case "draw4":
      room.pendingDraw += 4;
      room.activeColor = chosenColor ?? null;
      log.push(`${player.name} plays +4 (chooses ${chosenColor}).`);
      advanceTurn(room);
      break;
    case "draw2":
      room.pendingDraw += 2;
      room.activeColor = card.color ?? null;
      log.push(`${player.name} plays +2.`);
      advanceTurn(room);
      break;
    case "skip":
      room.activeColor = card.color ?? null;
      log.push(`${player.name} plays a Skip.`);
      advanceTurn(room, 2);
      break;
    case "reverse":
      room.activeColor = card.color ?? null;
      if (room.players.length === 2) {
        log.push(`${player.name} plays a Reverse (skips the other player).`);
        advanceTurn(room, 2);
      } else {
        room.currentDirection = room.currentDirection === 1 ? -1 : 1;
        log.push(`${player.name} plays a Reverse.`);
        advanceTurn(room);
      }
      break;
    case "vault-silver":
    case "vault-gold":
    case "vault-diamond":
      room.activeColor = null;
      log.push(`${player.name} plays ${card.name}.`);
      advanceTurn(room);
      break;
    default:
      room.activeColor = card.color ?? null;
      log.push(`${player.name} plays ${card.color} ${card.name}.`);
      advanceTurn(room);
      break;
  }

  if (isVaultCard(card)) {
    const isToken = isVaultTokenCard(card);
    const pending = room.pendingVault;
    const chosenCardId = isToken ? pending?.chosenCardId : undefined;
    const effectCard = chosenCardId
      ? pending?.offers.find((offer) => offer.id === chosenCardId)
      : card;
    const targets = isToken ? pending?.targetIds : undefined;
    room.pendingVault = undefined;
    const resolver = chosenCardId ? getResolver(chosenCardId) : getResolver(card.id);
    if (resolver) {
      const result = resolver({ game: room, actor: player.id, targets, random: rng });
      if (result.log) {
        log.push(...result.log);
      }
      if (effectCard) {
        effect = {
          cardId: effectCard.id,
          name: effectCard.name,
          tier: effectCard.type as VaultCardType,
          text: effectCard.effect ?? "",
          lines: result.log ?? [],
        };
      }
    }
  }

  let won = false;
  if (player.hand.length === 0) {
    room.status = "concluding";
    room.winnerId = player.id;
    room.winnerName = player.name;
    won = true;
  }
  return { ok: true, value: { log, won, effect } };
}

export function applyDraw(room: Room, rng: Rng = Math.random): EngineResult<DrawOutcome> {
  if (room.status !== "ongoing") {
    return { ok: false, error: "GAME_NOT_ACTIVE" };
  }
  const player = room.players[room.currentTurnIndex];
  if (!player) {
    return { ok: false, error: "GAME_NOT_ACTIVE" };
  }
  const amount = room.pendingDraw > 0 ? room.pendingDraw : 1;
  const cards = drawCards(room.deck, room.pile, amount, rng);
  player.hand.push(...cards);
  room.pendingDraw = 0;
  room.pendingWild = undefined;
  advanceTurn(room);
  return {
    ok: true,
    value: {
      log: [`${player.name} draws ${cards.length} card${cards.length === 1 ? "" : "s"}.`],
      drawn: cards.length,
    },
  };
}
