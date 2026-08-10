import type { GameAction, LobbyPlayer, PlayerView, RoomSummary } from "@bruno/shared";
import { buildDeck, dealHands, seedPile, type Rng } from "./deck.js";
import { applyTimeoutDraw, nextIndex, playCard, type EngineError } from "./engine.js";
import { toLobbyPlayers, toPlayerView, toRoomSummary } from "./player-view.js";
import { HAND_SIZE, Room } from "./room.js";
import { TurnManager } from "./turn-manager.js";
export type { EngineError } from "./engine.js";

export type RoomError =
  | "ROOM_NOT_FOUND"
  | "ROOM_FULL"
  | "ALREADY_IN_ROOM"
  | "GAME_STARTED"
  | "NOT_IN_ROOM"
  | "NOT_HOST"
  | "NO_PLAYERS"
  | "INVALID_PLAYER";

export type RoomResult<T> = { ok: true; value: T } | { ok: false; error: RoomError | EngineError };

function fail<T>(error: RoomError | EngineError): RoomResult<T> {
  return { ok: false, error };
}

export type RoomEvent =
  | { type: "log"; gameId: string; message: string }
  | { type: "turn"; gameId: string; playerIndex: number; playerId: string }
  | { type: "ended"; gameId: string; winnerId: string; winnerName: string };

export type RoomEventSink = (event: RoomEvent) => void;

export interface ActionOutcome {
  log: string[];
  won: boolean;
  nextPlayerId: string | null;
}

export interface RoomManagerOptions {
  eventSink?: RoomEventSink;
  turnManager?: TurnManager;
  rng?: Rng;
}

export class RoomManager {
  private rooms = new Map<string, Room>();
  private readonly eventSink: RoomEventSink;
  private readonly turnManager: TurnManager;
  private rng: Rng;

  constructor(options: RoomManagerOptions = {}) {
    this.eventSink = options.eventSink ?? (() => {});
    this.turnManager = options.turnManager ?? new TurnManager();
    this.rng = options.rng ?? Math.random;
  }

  private emit(event: RoomEvent): void {
    this.eventSink(event);
  }

  private emitTurn(room: Room): void {
    const player = room.players[room.currentTurnIndex];
    if (!player) {
      return;
    }
    this.emit({
      type: "turn",
      gameId: room.id,
      playerIndex: room.currentTurnIndex,
      playerId: player.id,
    });
  }

  private scheduleTurn(roomId: string): void {
    this.turnManager.scheduleTurn(roomId, () => this.onTurnTimeout(roomId));
  }

  private onTurnTimeout(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== "ongoing") {
      return;
    }
    const result = applyTimeoutDraw(room, this.rng);
    if (!result.ok) {
      return;
    }
    for (const message of result.value.log) {
      this.emit({ type: "log", gameId: roomId, message });
    }
    this.emitTurn(room);
    this.scheduleTurn(roomId);
  }

  createRoom(input: {
    name: string;
    playerId: string;
    playerName: string;
    maxPlayers: number;
  }): RoomResult<Room> {
    if (!input.playerId || !input.playerName) {
      return fail("INVALID_PLAYER");
    }
    const room = new Room({
      name: input.name,
      hostId: input.playerId,
      maxPlayers: input.maxPlayers,
    });
    room.players.push({ id: input.playerId, name: input.playerName, isHost: true, hand: [] });
    this.rooms.set(room.id, room);
    return { ok: true, value: room };
  }

  listRooms(): RoomSummary[] {
    const rooms: RoomSummary[] = [];
    for (const room of this.rooms.values()) {
      if (room.status === "prepping") {
        rooms.push(toRoomSummary(room));
      }
    }
    return rooms;
  }

  getRoom(gameId: string): Room | null {
    return this.rooms.get(gameId) ?? null;
  }

  joinRoom(gameId: string, playerId: string, playerName: string): RoomResult<Room> {
    const room = this.rooms.get(gameId);
    if (!room) {
      return fail("ROOM_NOT_FOUND");
    }
    if (room.status !== "prepping") {
      return fail("GAME_STARTED");
    }
    if (room.getPlayer(playerId)) {
      return { ok: true, value: room };
    }
    if (room.playerCount >= room.maxPlayers) {
      return fail("ROOM_FULL");
    }
    room.players.push({ id: playerId, name: playerName, isHost: false, hand: [] });
    return { ok: true, value: room };
  }

  leaveRoom(gameId: string, playerId: string): RoomResult<Room | null> {
    const room = this.rooms.get(gameId);
    if (!room) {
      return fail("ROOM_NOT_FOUND");
    }
    const removedIndex = room.getPlayerIndex(playerId);
    if (removedIndex === -1) {
      return fail("NOT_IN_ROOM");
    }
    const wasCurrentTurn = room.status === "ongoing" && removedIndex === room.currentTurnIndex;
    const oldNext = wasCurrentTurn ? nextIndex(room, 1) : null;

    room.players.splice(removedIndex, 1);

    if (room.status === "ongoing") {
      if (oldNext !== null) {
        room.pendingDraw = 0;
        room.currentTurnIndex = oldNext > removedIndex ? oldNext - 1 : oldNext;
      } else if (removedIndex < room.currentTurnIndex) {
        room.currentTurnIndex -= 1;
      }
    }

    if (room.players.length === 0) {
      this.turnManager.cancelTurn(gameId);
      this.rooms.delete(gameId);
      return { ok: true, value: null };
    }
    if (room.hostId === playerId) {
      const nextHost = room.players[0];
      if (nextHost) {
        nextHost.isHost = true;
        room.hostId = nextHost.id;
      }
    }
    if (room.status === "ongoing") {
      this.turnManager.cancelTurn(gameId);
      this.emitTurn(room);
      this.scheduleTurn(gameId);
    }
    return { ok: true, value: room };
  }

  getLobbyPlayers(gameId: string): LobbyPlayer[] | null {
    const room = this.rooms.get(gameId);
    if (!room) {
      return null;
    }
    return toLobbyPlayers(room);
  }

  startGame(gameId: string, playerId: string, rng: Rng = Math.random): RoomResult<Room> {
    const room = this.rooms.get(gameId);
    if (!room) {
      return fail("ROOM_NOT_FOUND");
    }
    if (room.hostId !== playerId) {
      return fail("NOT_HOST");
    }
    if (room.players.length === 0) {
      return fail("NO_PLAYERS");
    }
    room.status = "ongoing";
    this.rng = rng;
    room.deck = buildDeck(rng);
    const hands = dealHands(room.deck, room.players.length, HAND_SIZE);
    room.players.forEach((player, index) => {
      player.hand = hands[index] ?? [];
    });
    let top = seedPile(room.deck, room.pile);
    while (top?.type === "draw4") {
      room.deck.unshift(room.pile.pop()!);
      top = seedPile(room.deck, room.pile);
    }
    room.activeColor = top?.color ?? null;
    room.pendingDraw = 0;
    room.currentTurnIndex = Math.floor(rng() * room.players.length);
    room.currentDirection = 1;
    this.emit({ type: "log", gameId: room.id, message: "The game has started." });
    this.emitTurn(room);
    this.scheduleTurn(room.id);
    return { ok: true, value: room };
  }

  getPlayerView(gameId: string, playerId: string): RoomResult<PlayerView> {
    const room = this.rooms.get(gameId);
    if (!room) {
      return fail("ROOM_NOT_FOUND");
    }
    if (!room.getPlayer(playerId)) {
      return fail("NOT_IN_ROOM");
    }
    return { ok: true, value: toPlayerView(room, playerId) };
  }

  performAction(gameId: string, playerId: string, action: GameAction): RoomResult<ActionOutcome> {
    const room = this.rooms.get(gameId);
    if (!room) {
      return fail("ROOM_NOT_FOUND");
    }
    if (room.status !== "ongoing") {
      return fail("GAME_NOT_ACTIVE");
    }
    const player = room.getPlayer(playerId);
    if (!player) {
      return fail("NOT_IN_ROOM");
    }
    const playerIndex = room.getPlayerIndex(playerId);
    if (action.type !== "play") {
      if (action.type === "draw") {
        return fail("DRAW_NOT_ALLOWED");
      }
      return fail("INVALID_ACTION");
    }
    if (playerIndex !== room.currentTurnIndex) {
      return fail("NOT_YOUR_TURN");
    }
    if (action.cardIndex === undefined) {
      return fail("INVALID_CARD");
    }
    const result = playCard(room, player, action.cardIndex, action.chosenColor);
    if (!result.ok) {
      return fail(result.error);
    }
    this.turnManager.cancelTurn(gameId);
    for (const message of result.value.log) {
      this.emit({ type: "log", gameId, message });
    }
    if (result.value.won) {
      this.emit({
        type: "ended",
        gameId,
        winnerId: room.winnerId ?? player.id,
        winnerName: room.winnerName ?? player.name,
      });
      return {
        ok: true,
        value: { log: result.value.log, won: true, nextPlayerId: null },
      };
    }
    this.emitTurn(room);
    this.scheduleTurn(gameId);
    const nextPlayer = room.players[room.currentTurnIndex];
    return {
      ok: true,
      value: { log: result.value.log, won: false, nextPlayerId: nextPlayer?.id ?? null },
    };
  }
}
