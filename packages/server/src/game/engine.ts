import type { Card, Color } from "@bruno/shared";
import { isVaultCard, isVaultTokenCard } from "@bruno/shared";
import type { VaultCardType } from "@bruno/shared";
import { draw as drawCards, type Rng } from "./deck.js";
import {
  emitGameEvent,
  findOwnerPassive,
  getResolver,
  hasPassive,
  isWinAllowed,
  runDueDeferred,
} from "./effects/index.js";
import { rollNextMayhem } from "./systems.js";
import type { Player, Room } from "./room.js";

export type EngineError =
  | "NOT_YOUR_TURN"
  | "INVALID_CARD"
  | "CARD_NOT_PLAYABLE"
  | "CHOOSE_COLOR_REQUIRED"
  | "GAME_NOT_ACTIVE"
  | "DRAW_NOT_ALLOWED"
  | "INVALID_ACTION"
  | "CANNOT_PAY_CONDITION"
  | "PROMPT_EXPIRED"
  | "INVALID_VAULT_CHOICE";

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
    targets?: string[];
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

export function isPlayable(card: Card, room: Room, player?: Player): boolean {
  // t1-cutthroat: while an enemy owner has it active, this player's special (non-number)
  // cards are Deadweight — unplayable.
  if (player && card.type !== "number") {
    const deadweight = room.passives.some((p) => p.kind === "cutthroat" && p.ownerId !== player.id);
    if (deadweight) {
      return false;
    }
  }
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
    return true;
  }
  if (card.color === room.activeColor) {
    return true;
  }
  return isSymbolMatch(card, pileTop(room));
}

export function stepIndex(room: Room, fromIndex: number, steps = 1): number {
  const n = room.players.length;
  if (n === 0) {
    return 0;
  }
  const raw = fromIndex + room.currentDirection * steps;
  return ((raw % n) + n) % n;
}

export function nextIndex(room: Room, steps = 1): number {
  return stepIndex(room, room.currentTurnIndex, steps);
}

export function advanceTurn(room: Room, steps = 1): void {
  const n = room.players.length;
  const prevIndex = room.currentTurnIndex;
  let index = stepIndex(room, room.currentTurnIndex, steps);
  // A round is one pass around the table: it completes when play wraps past seat 0
  // (forward) or past seat n-1 (reverse). Heuristic — reverses and 2-player games blur it.
  const wrapped =
    room.currentDirection === 1 ? index < room.currentTurnIndex : index > room.currentTurnIndex;
  if (wrapped) {
    room.round += 1;
  }
  let hops = 0;
  while (n > 0 && hops < n) {
    const player = room.players[index];
    const isSkipped = (player?.skippedTurns ?? 0) > 0;
    const isLiquidated = (player?.liquidationUntilRound ?? -1) >= room.round;
    if (!player || (!isSkipped && !isLiquidated)) {
      break;
    }
    if (isSkipped) {
      player.skippedTurns = (player.skippedTurns ?? 0) - 1;
    }
    index = stepIndex(room, index, 1);
    hops += 1;
  }
  room.currentTurnIndex = index;
  // t1-zephyr: a fresh turn on a different player resets their "2 cards per turn" budget.
  if (index !== prevIndex && room.players[index]) {
    const zephyr = findOwnerPassive(room, "zephyr", room.players[index]!.id);
    if (zephyr) {
      zephyr.playsThisTurn = 0;
    }
  }
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
  if (!isPlayable(card, room, player)) {
    return { ok: false, error: "CARD_NOT_PLAYABLE" };
  }

  const actorIndex = room.getPlayerIndex(player.id);
  const roundBefore = room.round;
  const umf = hasPassive(room, "ultimate-machine-form", player.id);
  const isFleeting = card.tags.includes("fleeting");
  player.hand.splice(cardIndex, 1);
  if (isFleeting) {
    room.fleetingPileTop = card;
  } else {
    room.pile.push(card);
    room.fleetingPileTop = undefined;
  }
  room.pileLog.push({ round: room.round, playerId: player.id, card });
  const log: string[] = [];
  let effect: PlayOutcome["effect"] | undefined;
  const skippedTargets: string[] = [];

  switch (card.type) {
    case "draw4":
      room.pendingDraw += 4 * (umf ? 2 : 1);
      room.activeColor = chosenColor ?? null;
      log.push(`${player.name} plays +4 (chooses ${chosenColor}).`);
      advanceTurn(room);
      break;
    case "draw2":
      room.pendingDraw += 2 * (umf ? 2 : 1);
      room.activeColor = card.color ?? null;
      log.push(`${player.name} plays +2.`);
      advanceTurn(room);
      break;
    case "skip":
      room.activeColor = card.color ?? null;
      log.push(`${player.name} plays a Skip.`);
      {
        const skipped = room.players[stepIndex(room, room.currentTurnIndex, 1)];
        if (skipped && skipped.id !== player.id) {
          skippedTargets.push(skipped.id);
        }
      }
      advanceTurn(room, 2);
      break;
    case "reverse":
      room.activeColor = card.color ?? null;
      if (room.players.length === 2) {
        log.push(`${player.name} plays a Reverse (skips the other player).`);
        {
          const skipped = room.players[stepIndex(room, room.currentTurnIndex, 1)];
          if (skipped && skipped.id !== player.id) {
            skippedTargets.push(skipped.id);
          }
        }
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
      log.push(`${player.name} plays ${card.name}.`);
      advanceTurn(room);
      break;
    default:
      room.activeColor = card.color ?? null;
      log.push(`${player.name} plays ${card.color} ${card.name}.`);
      advanceTurn(room);
      break;
  }

  player.playedEffectIds = [...(player.playedEffectIds ?? []), card.id];
  for (const targetId of skippedTargets) {
    const skipped = emitGameEvent(
      room,
      { kind: "player-skipped", causePlayerId: player.id, targetId },
      rng,
    );
    log.push(...skipped.logs);
  }

  let keepTurn = false;
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
    if (effectCard) {
      player.playedEffectIds = [...(player.playedEffectIds ?? []), effectCard.id];
    }
    if (resolver) {
      const isVolcanoSilverGold =
        room.locationId === "loc-volcano" &&
        (effectCard?.type === "vault-silver" || effectCard?.type === "vault-gold");
      const result = resolver({
        game: room,
        actor: player.id,
        targets,
        chosenColor: pending?.chosenColor,
        picked: pending?.chosenCardIds,
        random: rng,
        amountMultiplier: (isVolcanoSilverGold ? 2 : 1) * (umf ? 2 : 1),
        roundPlayed: roundBefore,
      });
      if (result.log) {
        log.push(...result.log);
      }
      if (result.keepTurn) {
        keepTurn = true;
      }
      if (effectCard) {
        effect = {
          cardId: effectCard.id,
          name: effectCard.name,
          tier: effectCard.type as VaultCardType,
          text: effectCard.effect ?? "",
          lines: result.log ?? [],
          targets,
        };
        room.pileEffect = {
          cardId: effectCard.id,
          name: effectCard.name,
          tier: effectCard.type as VaultCardType,
          text: effectCard.effect ?? "",
        };
      }
    }
  }

  let won = false;
  if (player.hand.length === 0) {
    const winCheck = isWinAllowed(room, player);
    if (winCheck.allowed) {
      room.status = "concluding";
      room.winnerId = player.id;
      room.winnerName = player.name;
      won = true;
    } else {
      log.push(winCheck.reason ?? `${player.name} cannot win yet.`);
    }
  }

  const cardPlayed = emitGameEvent(room, { kind: "card-played", playerId: player.id, card }, rng);
  log.push(...cardPlayed.logs);
  keepTurn = keepTurn || cardPlayed.keepTurn;
  if (room.round !== roundBefore) {
    log.push(...emitGameEvent(room, { kind: "round-advanced", newRound: room.round }, rng).logs);
    log.push(...rollNextMayhem(room, rng));
  }
  if (keepTurn && !won) {
    room.currentTurnIndex = actorIndex;
    log.push(`${player.name} takes another turn.`);
  }
  log.push(...runDueDeferred(room, rng));
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
  const roundBefore = room.round;
  const amount = room.pendingDraw > 0 ? room.pendingDraw : 1;
  const cards = drawCards(room.deck, room.pile, amount, rng);
  player.hand.push(...cards);
  room.pendingDraw = 0;
  room.pendingWild = undefined;
  advanceTurn(room);
  const log = [`${player.name} draws ${cards.length} card${cards.length === 1 ? "" : "s"}.`];
  const drawEvent = emitGameEvent(
    room,
    { kind: "draw", playerId: player.id, count: cards.length },
    rng,
  );
  log.push(...drawEvent.logs);
  if (room.round !== roundBefore) {
    log.push(...emitGameEvent(room, { kind: "round-advanced", newRound: room.round }, rng).logs);
    log.push(...rollNextMayhem(room, rng));
  }
  log.push(...runDueDeferred(room, rng));
  return {
    ok: true,
    value: {
      log,
      drawn: cards.length,
    },
  };
}
