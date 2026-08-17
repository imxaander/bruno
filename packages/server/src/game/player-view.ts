import type {
  ActivePassive,
  Card,
  CardView,
  LobbyPlayer,
  PlayerView,
  PublicPlayer,
  RoomSummary,
} from "@bruno/shared";
import { PASSIVE_META } from "@bruno/shared";
import { isPlayable } from "./engine.js";
import type { PassiveState, Player, Room } from "./room.js";

export function toCardView(card: Card): CardView {
  return {
    id: card.id,
    type: card.type,
    color: card.color,
    number: card.number,
    image: card.image,
    tags: card.tags,
  };
}

export function toLobbyPlayers(room: Room): LobbyPlayer[] {
  return room.players.map((player) => ({
    id: player.id,
    name: player.name,
    isHost: player.isHost,
  }));
}

function toPublicPlayer(player: Player, isTurn: boolean): PublicPlayer {
  return {
    id: player.id,
    name: player.name,
    isHost: player.isHost,
    isTurn,
    handCount: player.hand.length,
  };
}

function getAffectedPlayerIds(passive: PassiveState, room: Room): string[] {
  switch (passive.kind) {
    case "accumulation":
    case "investment":
    case "zephyr":
    case "prayers":
    case "ultimate-machine-form":
    case "parasitism":
    case "tyranny":
    case "equality":
    case "silver-tongue":
    case "maim":
    case "cutthroat":
      return [passive.ownerId];
    case "most-wanted":
      return [passive.targetId];
    case "cruelty":
      return [...passive.victims];
    case "scourge":
      return [passive.infecteeId];
  }
}

export function toPlayerView(
  room: Room,
  playerId: string,
  turnDurationSeconds: number,
): PlayerView {
  const me = room.getPlayer(playerId);
  const pileTopCard = room.pile.length > 0 ? room.pile[room.pile.length - 1] : undefined;
  const revealed = (room.reveals.get(playerId) ?? [])
    .map((reveal) => {
      const player = room.getPlayer(reveal.playerId);
      return player ? { playerId: player.id, cards: player.hand.map(toCardView) } : null;
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  const view: PlayerView = {
    playerCount: room.playerCount,
    players: room.players.map((player) =>
      toPublicPlayer(player, room.getPlayerIndex(player.id) === room.currentTurnIndex),
    ),
    you: {
      index: room.getPlayerIndex(playerId),
      hand: me ? me.hand.map(toCardView) : [],
      playable: me ? me.hand.map((card) => isPlayable(card, room, me)) : [],
    },
    pileTop: pileTopCard ? toCardView(pileTopCard) : null,
    deckCount: room.deck.length,
    currentTurnIndex: room.currentTurnIndex,
    currentDirection: room.currentDirection,
    activeColor: room.activeColor,
    pendingDraw: room.pendingDraw,
    locationId: room.locationId,
    mayhemEventId: room.mayhemEventId,
    status: room.status,
    turnDuration: turnDurationSeconds,
    turnDeadline: room.turnDeadline,
    pileEffect: room.pileEffect,
    revealed: revealed.length > 0 ? revealed : undefined,
    investmentOffer: room.investmentPending.has(playerId) || undefined,
    fleetingPileTop: room.fleetingPileTop ? toCardView(room.fleetingPileTop) : undefined,
    reconnectGraceMs: room.reconnectGrace
      ? Math.max(0, room.reconnectGrace.until - Date.now())
      : undefined,
    connected: me?.connected ?? true,
    startedAt: room.startedAt,
  };

  const myPassives: ActivePassive[] = [];

  for (const p of room.passives) {
    const meta = PASSIVE_META[p.kind];
    if (!meta) continue;
    const affected = getAffectedPlayerIds(p, room);
    if (!affected.includes(playerId)) continue;
    const owner = room.getPlayer(p.ownerId);
    myPassives.push({
      kind: p.kind,
      name: meta.name,
      icon: meta.icon,
      description: meta.description,
      ownerId: p.ownerId,
      ownerName: owner?.name ?? p.ownerId,
    });
  }

  if (myPassives.length > 0) {
    view.myPassives = myPassives;
  }

  return view;
}

export function toRoomSummary(room: Room): RoomSummary {
  return {
    id: room.id,
    name: room.name,
    playerCount: room.playerCount,
    maxPlayers: room.maxPlayers,
  };
}
