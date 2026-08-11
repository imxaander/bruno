import type {
  Card,
  Color,
  GameAction,
  LobbyPlayer,
  PlayerView,
  RoomSummary,
  VaultCardType,
} from "@bruno/shared";
import { isVaultTokenCard } from "@bruno/shared";
import { buildDeck, dealHands, seedPile, type Rng } from "./deck.js";
import { applyDraw, hasPlayableCard, nextIndex, playCard, type EngineError } from "./engine.js";
import { sampleVaultOffers, getResolverInputs } from "./effects/index.js";
import { toLobbyPlayers, toPlayerView, toRoomSummary } from "./player-view.js";
import { HAND_SIZE, type Player, Room } from "./room.js";
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

const VAULT_OFFER_COUNT = 5;

function fail<T>(error: RoomError | EngineError): RoomResult<T> {
  return { ok: false, error };
}

export type RoomEvent =
  | { type: "log"; gameId: string; message: string }
  | { type: "turn"; gameId: string; playerIndex: number; playerId: string }
  | { type: "ended"; gameId: string; winnerId: string; winnerName: string }
  | { type: "prompt"; gameId: string; playerId: string; kind: "choose-color" }
  | { type: "prompt"; gameId: string; playerId: string; kind: "vault-choice"; offers: Card[] }
  | {
      type: "prompt";
      gameId: string;
      playerId: string;
      kind: "pick-players";
      min: number;
      max: number;
      allowSelf?: boolean;
    }
  | {
      type: "effect";
      gameId: string;
      playerId: string;
      playerName: string;
      cardId: string;
      name: string;
      tier: VaultCardType;
      text: string;
      lines: string[];
    };

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

  private defaultColor(room: Room, player: Player): Color {
    const counts = new Map<Color, number>();
    for (const card of player.hand) {
      if (card.color) {
        counts.set(card.color, (counts.get(card.color) ?? 0) + 1);
      }
    }
    let best: Color | null = null;
    let bestCount = 0;
    for (const [color, count] of counts) {
      if (count > bestCount) {
        best = color;
        bestCount = count;
      }
    }
    return best ?? room.activeColor ?? "red";
  }

  private defaultTargetIds(
    room: Room,
    actor: Player,
    spec: { min: number; allowSelf?: boolean },
  ): string[] {
    const candidates = room.players
      .filter((player) => player.id !== actor.id || spec.allowSelf)
      .map((player) => player.id);
    return candidates.slice(0, spec.min);
  }

  private resolveOpenPrompt(room: Room, player: Player): boolean {
    if (room.pendingWild) {
      const pending = room.pendingWild;
      room.pendingWild = undefined;
      const color = this.defaultColor(room, player);
      this.emit({
        type: "log",
        gameId: room.id,
        message: `${player.name} didn't choose a color — defaulting to ${color}.`,
      });
      this.completePlay(room, player, pending.cardIndex, color);
      return true;
    }
    if (room.pendingVault) {
      const pending = room.pendingVault;
      if (!pending.targetSpec) {
        const offer = pending.offers[0];
        if (offer) {
          pending.chosenCardId = offer.id;
          const spec = getResolverInputs(offer.id)?.targets;
          if (spec) {
            pending.targetSpec = spec;
            pending.targetIds = this.defaultTargetIds(room, player, spec);
          }
          this.emit({
            type: "log",
            gameId: room.id,
            message: `${player.name} didn't pick a vault effect — defaulting to ${offer.name}.`,
          });
          this.completePlay(room, player, pending.cardIndex, undefined);
          return true;
        }
      } else {
        pending.targetIds = this.defaultTargetIds(room, player, pending.targetSpec);
        this.emit({
          type: "log",
          gameId: room.id,
          message: `${player.name} didn't pick targets — defaulting to ${pending.targetIds.length} player(s).`,
        });
        this.completePlay(room, player, pending.cardIndex, undefined);
        return true;
      }
    }
    return false;
  }

  private onTurnTimeout(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== "ongoing") {
      return;
    }
    const player = room.players[room.currentTurnIndex];
    if (!player) {
      return;
    }
    if (this.resolveOpenPrompt(room, player)) {
      return;
    }
    const result = applyDraw(room, this.rng);
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
        // A disconnecting current-turn player drops any open prompt (their action is abandoned).
        room.pendingWild = undefined;
        room.pendingVault = undefined;
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
    while (
      top &&
      (top.type === "draw4" ||
        top.type === "vault-silver" ||
        top.type === "vault-gold" ||
        top.type === "vault-diamond")
    ) {
      room.deck.unshift(room.pile.pop()!);
      top = seedPile(room.deck, room.pile);
    }
    room.activeColor = top?.color ?? null;
    room.pendingDraw = 0;
    room.pendingWild = undefined;
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
    return {
      ok: true,
      value: toPlayerView(room, playerId, this.turnManager.durationMs / 1000),
    };
  }

  private completePlay(
    room: Room,
    player: Player,
    cardIndex: number,
    chosenColor: Color | undefined,
  ): RoomResult<ActionOutcome> {
    const result = playCard(room, player, cardIndex, chosenColor, this.rng);
    if (!result.ok) {
      return fail(result.error);
    }
    this.turnManager.cancelTurn(room.id);
    for (const message of result.value.log) {
      this.emit({ type: "log", gameId: room.id, message });
    }
    const effect = result.value.effect;
    if (effect) {
      this.emit({
        type: "effect",
        gameId: room.id,
        playerId: player.id,
        playerName: player.name,
        ...effect,
      });
    }
    if (result.value.won) {
      this.emit({
        type: "ended",
        gameId: room.id,
        winnerId: room.winnerId ?? player.id,
        winnerName: room.winnerName ?? player.name,
      });
      return {
        ok: true,
        value: { log: result.value.log, won: true, nextPlayerId: null },
      };
    }
    this.emitTurn(room);
    this.scheduleTurn(room.id);
    const nextPlayer = room.players[room.currentTurnIndex];
    return {
      ok: true,
      value: { log: result.value.log, won: false, nextPlayerId: nextPlayer?.id ?? null },
    };
  }

  private applyChooseColor(
    room: Room,
    player: Player,
    chosenColor?: Color,
  ): RoomResult<ActionOutcome> {
    const pending = room.pendingWild;
    if (!pending || pending.playerId !== player.id) {
      return fail("INVALID_ACTION");
    }
    if (!chosenColor) {
      return fail("CHOOSE_COLOR_REQUIRED");
    }
    room.pendingWild = undefined;
    return this.completePlay(room, player, pending.cardIndex, chosenColor);
  }

  private applyPlay(room: Room, player: Player, action: GameAction): RoomResult<ActionOutcome> {
    if (room.pendingWild || room.pendingVault) {
      return fail("INVALID_ACTION");
    }
    if (action.cardIndex === undefined) {
      return fail("INVALID_CARD");
    }
    const card = player.hand[action.cardIndex];
    if (card?.type === "draw4" && !action.chosenColor) {
      room.pendingWild = { cardIndex: action.cardIndex, playerId: player.id };
      this.scheduleTurn(room.id);
      this.emit({ type: "prompt", gameId: room.id, playerId: player.id, kind: "choose-color" });
      return { ok: true, value: { log: [], won: false, nextPlayerId: null } };
    }
    if (card && isVaultTokenCard(card)) {
      const offers = sampleVaultOffers(card.type, VAULT_OFFER_COUNT, this.rng);
      room.pendingVault = {
        cardIndex: action.cardIndex,
        playerId: player.id,
        tier: card.type,
        offers,
      };
      this.scheduleTurn(room.id);
      this.emit({
        type: "prompt",
        gameId: room.id,
        playerId: player.id,
        kind: "vault-choice",
        offers,
      });
      return { ok: true, value: { log: [], won: false, nextPlayerId: null } };
    }
    return this.completePlay(room, player, action.cardIndex, action.chosenColor);
  }

  private applyVaultChoice(
    room: Room,
    player: Player,
    chosenCardId: string | undefined,
  ): RoomResult<ActionOutcome> {
    const pending = room.pendingVault;
    if (!pending || pending.playerId !== player.id) {
      return fail("INVALID_ACTION");
    }
    const offer = pending.offers.find((card) => card.id === chosenCardId);
    if (!offer) {
      return fail("INVALID_ACTION");
    }
    pending.chosenCardId = offer.id;
    const spec = getResolverInputs(offer.id)?.targets;
    if (spec) {
      pending.targetSpec = spec;
      this.scheduleTurn(room.id);
      this.emit({
        type: "prompt",
        gameId: room.id,
        playerId: player.id,
        kind: "pick-players",
        min: spec.min,
        max: spec.max,
        allowSelf: spec.allowSelf,
      });
      return { ok: true, value: { log: [], won: false, nextPlayerId: null } };
    }
    return this.completePlay(room, player, pending.cardIndex, undefined);
  }

  private applyChooseTargets(
    room: Room,
    player: Player,
    targetIds: string[] | undefined,
  ): RoomResult<ActionOutcome> {
    const pending = room.pendingVault;
    if (!pending || pending.playerId !== player.id) {
      return fail("INVALID_ACTION");
    }
    const spec = pending.targetSpec;
    if (!spec) {
      return fail("INVALID_ACTION");
    }
    if (!targetIds || targetIds.length < spec.min || targetIds.length > spec.max) {
      return fail("INVALID_ACTION");
    }
    if (new Set(targetIds).size !== targetIds.length) {
      return fail("INVALID_ACTION");
    }
    for (const id of targetIds) {
      if (!room.getPlayer(id)) {
        return fail("INVALID_ACTION");
      }
    }
    if (!spec.allowSelf && targetIds.includes(player.id)) {
      return fail("INVALID_ACTION");
    }
    pending.targetIds = targetIds;
    return this.completePlay(room, player, pending.cardIndex, undefined);
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
    if (playerIndex !== room.currentTurnIndex) {
      return fail("NOT_YOUR_TURN");
    }
    if (action.type === "play") {
      return this.applyPlay(room, player, action);
    }
    if (action.type === "choose-color") {
      if (room.pendingVault) {
        return fail("INVALID_ACTION");
      }
      return this.applyChooseColor(room, player, action.chosenColor);
    }
    if (action.type === "vault-choice") {
      return this.applyVaultChoice(room, player, action.cardId);
    }
    if (action.type === "choose-targets") {
      return this.applyChooseTargets(room, player, action.targetIds);
    }
    if (action.type === "draw") {
      if (room.pendingWild || room.pendingVault) {
        return fail("DRAW_NOT_ALLOWED");
      }
      if (room.pendingDraw === 0 && hasPlayableCard(room, player, { countVaults: false })) {
        return fail("DRAW_NOT_ALLOWED");
      }
      const result = applyDraw(room, this.rng);
      if (!result.ok) {
        return fail(result.error);
      }
      this.turnManager.cancelTurn(room.id);
      for (const message of result.value.log) {
        this.emit({ type: "log", gameId, message });
      }
      this.emitTurn(room);
      this.scheduleTurn(room.id);
      const nextPlayer = room.players[room.currentTurnIndex];
      return {
        ok: true,
        value: { log: result.value.log, won: false, nextPlayerId: nextPlayer?.id ?? null },
      };
    }
    return fail("INVALID_ACTION");
  }
}
