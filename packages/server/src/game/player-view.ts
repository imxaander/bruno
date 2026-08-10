import type {
  Card,
  CardView,
  LobbyPlayer,
  PlayerView,
  PublicPlayer,
  RoomSummary,
} from "@bruno/shared";
import type { Player, Room } from "./room.js";

export function toCardView(card: Card): CardView {
  return {
    id: card.id,
    type: card.type,
    color: card.color,
    number: card.number,
    image: card.image,
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

export function toPlayerView(room: Room, playerId: string): PlayerView {
  const me = room.getPlayer(playerId);
  const pileTopCard = room.pile.length > 0 ? room.pile[room.pile.length - 1] : undefined;
  return {
    playerCount: room.playerCount,
    players: room.players.map((player) =>
      toPublicPlayer(player, room.getPlayerIndex(player.id) === room.currentTurnIndex),
    ),
    you: {
      index: room.getPlayerIndex(playerId),
      hand: me ? me.hand.map(toCardView) : [],
    },
    pileTop: pileTopCard ? toCardView(pileTopCard) : null,
    deckCount: room.deck.length,
    currentTurnIndex: room.currentTurnIndex,
    currentDirection: room.currentDirection,
    activeColor: room.activeColor,
    pendingDraw: room.pendingDraw,
    status: room.status,
  };
}

export function toRoomSummary(room: Room): RoomSummary {
  return {
    id: room.id,
    name: room.name,
    playerCount: room.playerCount,
    maxPlayers: room.maxPlayers,
  };
}
