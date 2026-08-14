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
import { applyDraw, nextIndex, playCard, type EngineError } from "./engine.js";
import { getResolverInputs, revealHands, sampleVaultOffers } from "./effects/index.js";
import { countMatchingCards } from "./effects/helpers.js";
import {
  applyLocationStart,
  applyMayhem,
  applyOriginStart,
  chooseRandomLocation,
  chooseRandomMayhem,
  chooseRandomOrigin,
  effectiveVaultTier,
} from "./systems.js";
import { toLobbyPlayers, toPlayerView, toRoomSummary } from "./player-view.js";
import { HAND_SIZE, type PendingVault, type Player, Room } from "./room.js";
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

const VAULT_OFFER_COUNT = 3;

function fail<T>(error: RoomError | EngineError): RoomResult<T> {
  return { ok: false, error };
}

export type RoomEvent =
  | { type: "log"; gameId: string; message: string }
  | { type: "draw"; gameId: string; playerId: string; playerName: string; count: number }
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
      type: "prompt";
      gameId: string;
      playerId: string;
      kind: "pick-cards";
      min: number;
      max: number;
      sourcePlayerIds: string[];
      perPlayer?: { min: number; max: number };
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
      targetNames?: string[];
    };

export type RoomEventSink = (event: RoomEvent) => void;

export interface ActionOutcome {
  log: string[];
  won: boolean;
  nextPlayerId: string | null;
}

/**
 * Lets the caller force (or suppress) the random start-of-game modifiers.
 * Each field: undefined = random pick, null = none, string = force that card.
 * `mayhemEventId` is only honored while the location is Hell Gate (mayhem is
 * Hell Gate's effect); without Hell Gate no mayhem event is rolled.
 */
export interface StartGameOptions {
  locationId?: string | null;
  mayhemEventId?: string | null;
  originId?: string | null;
}

export interface RoomManagerOptions {
  eventSink?: RoomEventSink;
  turnManager?: TurnManager;
  rng?: Rng;
  startOptions?: StartGameOptions;
}

export class RoomManager {
  private rooms = new Map<string, Room>();
  private readonly eventSink: RoomEventSink;
  private readonly turnManager: TurnManager;
  private readonly startOptions: StartGameOptions | undefined;
  private rng: Rng;

  constructor(options: RoomManagerOptions = {}) {
    this.eventSink = options.eventSink ?? (() => {});
    this.turnManager = options.turnManager ?? new TurnManager();
    this.startOptions = options.startOptions;
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
    const room = this.rooms.get(roomId);
    if (room && room.status === "ongoing") {
      room.turnDeadline = Date.now() + this.turnManager.durationMs;
    }
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

  private availableCards(room: Room, sourceIds: string[]): Card[] {
    return room.players.flatMap((player) => (sourceIds.includes(player.id) ? player.hand : []));
  }

  /** Clears one-shot reveals for everyone but the acting viewer. */
  private pruneOneShotReveals(room: Room, keepViewerId: string): void {
    for (const [viewer, reveals] of room.reveals) {
      if (viewer === keepViewerId) {
        continue;
      }
      const kept = reveals.filter((reveal) => reveal.permanent);
      if (kept.length > 0) {
        room.reveals.set(viewer, kept);
      } else {
        room.reveals.delete(viewer);
      }
    }
  }

  /** Minimum legal pick on timeout: perPlayer.min from each source, else fill to min. */
  private autoPickCards(room: Room, pending: PendingVault): string[] {
    const spec = pending.stealSpec;
    if (!spec) {
      return [];
    }
    const picked: string[] = [];
    const perSource = new Map<string, number>();
    for (const sourceId of pending.targetIds ?? []) {
      if (picked.length >= spec.min) {
        break;
      }
      const source = room.getPlayer(sourceId);
      if (!source) {
        continue;
      }
      for (const card of source.hand) {
        if (picked.length >= spec.min) {
          break;
        }
        const fromHere = perSource.get(sourceId) ?? 0;
        if (spec.perPlayer && fromHere >= spec.perPlayer.min) {
          break;
        }
        picked.push(card.id);
        perSource.set(sourceId, fromHere + 1);
      }
    }
    return picked;
  }

  private resolveOpenPrompt(room: Room, player: Player): boolean {
    if (room.pendingWild) {
      const pending = room.pendingWild;
      if (pending.playerId !== player.id) {
        // The pending color choice belongs to a different player — don't resolve it.
        return false;
      }
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
      if (pending.playerId !== player.id) {
        // The pending vault choice belongs to a different player — don't resolve it.
        return false;
      }
      if (!pending.targetSpec) {
        const offer = pending.offers[0];
        if (offer) {
          pending.chosenCardId = offer.id;
          const spec = getResolverInputs(offer.id)?.targets;
          if (spec) {
            pending.targetSpec = spec;
            pending.targetIds = this.defaultTargetIds(room, player, spec);
          }
          const steal = getResolverInputs(offer.id)?.steal;
          if (steal) {
            pending.stealSpec = steal;
            pending.chosenCardIds = this.autoPickCards(room, pending);
          }
          this.emit({
            type: "log",
            gameId: room.id,
            message: `${player.name} didn't pick a vault effect — defaulting to ${offer.name}.`,
          });
          this.completePlay(room, player, pending.cardIndex, undefined);
          return true;
        }
      } else if (pending.stealSpec) {
        pending.chosenCardIds = this.autoPickCards(room, pending);
        this.emit({
          type: "log",
          gameId: room.id,
          message: `${player.name} didn't pick cards — defaulting to ${pending.chosenCardIds.length} card(s).`,
        });
        this.completePlay(room, player, pending.cardIndex, undefined);
        return true;
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
    this.emit({
      type: "draw",
      gameId: roomId,
      playerId: player.id,
      playerName: player.name,
      count: result.value.drawn,
    });
    for (const message of result.value.log) {
      this.emit({ type: "log", gameId: roomId, message });
    }
    this.scheduleTurn(roomId);
    this.emitTurn(room);
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
    room.players.push({
      id: input.playerId,
      name: input.playerName,
      isHost: true,
      hand: [],
      artifactIds: [],
      playedEffectIds: [],
    });
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
    room.players.push({
      id: playerId,
      name: playerName,
      isHost: false,
      hand: [],
      artifactIds: [],
      playedEffectIds: [],
    });
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

    for (const [viewer, reveals] of room.reveals) {
      const kept = reveals.filter((reveal) => reveal.playerId !== playerId);
      if (kept.length > 0) {
        room.reveals.set(viewer, kept);
      } else {
        room.reveals.delete(viewer);
      }
    }

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
      this.scheduleTurn(gameId);
      this.emitTurn(room);
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

  startGame(
    gameId: string,
    playerId: string,
    rng: Rng = Math.random,
    options?: StartGameOptions,
  ): RoomResult<Room> {
    const room = this.rooms.get(gameId);
    if (!room) {
      return fail("ROOM_NOT_FOUND");
    }
    if (room.status !== "prepping") {
      return fail("GAME_STARTED");
    }
    if (room.hostId !== playerId) {
      return fail("NOT_HOST");
    }
    if (room.players.length === 0) {
      return fail("NO_PLAYERS");
    }
    const start = options ?? this.startOptions ?? {};
    room.status = "ongoing";
    this.rng = rng;
    room.deck = buildDeck(rng);
    const hands = dealHands(room.deck, room.players.length, HAND_SIZE);
    room.players.forEach((player, index) => {
      player.hand = hands[index] ?? [];
      player.artifactIds = player.artifactIds ?? [];
      player.playedEffectIds = [];
      player.originId =
        start.originId === undefined ? chooseRandomOrigin(rng) : (start.originId ?? undefined);
    });
    room.locationId =
      start.locationId === undefined ? chooseRandomLocation(rng) : (start.locationId ?? undefined);
    room.mayhemEventId =
      room.locationId === "loc-hell-gate"
        ? start.mayhemEventId === undefined
          ? chooseRandomMayhem(rng)
          : (start.mayhemEventId ?? undefined)
        : undefined;
    room.usedMayhemIds = room.mayhemEventId ? [room.mayhemEventId] : [];

    const locationLogs = applyLocationStart(room, rng);
    for (const message of locationLogs) {
      this.emit({ type: "log", gameId: room.id, message });
    }

    for (const player of room.players) {
      const originLogs = applyOriginStart(room, player, rng);
      for (const message of originLogs) {
        this.emit({ type: "log", gameId: room.id, message });
      }
    }

    const mayhemLogs = applyMayhem(room, rng);
    for (const message of mayhemLogs) {
      this.emit({ type: "log", gameId: room.id, message });
    }

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
    this.scheduleTurn(room.id);
    this.emitTurn(room);
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
      const targetNames = effect.targets?.map((id) => room.getPlayer(id)?.name ?? id) ?? [];
      this.emit({
        type: "effect",
        gameId: room.id,
        playerId: player.id,
        playerName: player.name,
        ...effect,
        targetNames,
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
    this.scheduleTurn(room.id);
    this.emitTurn(room);
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
    const pendingWild = room.pendingWild;
    if (pendingWild && pendingWild.playerId === player.id) {
      if (!chosenColor) {
        return fail("CHOOSE_COLOR_REQUIRED");
      }
      room.pendingWild = undefined;
      return this.completePlay(room, player, pendingWild.cardIndex, chosenColor);
    }
    const pendingVault = room.pendingVault;
    if (pendingVault && pendingVault.playerId === player.id && pendingVault.colorRequired) {
      if (!chosenColor) {
        return fail("CHOOSE_COLOR_REQUIRED");
      }
      pendingVault.chosenColor = chosenColor;
      pendingVault.colorRequired = false;
      return this.completePlay(room, player, pendingVault.cardIndex, chosenColor);
    }
    return fail("INVALID_ACTION");
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
      const tier = effectiveVaultTier(room, card.type);
      room.firstVaultPlayed = true;
      const offers = sampleVaultOffers(tier, VAULT_OFFER_COUNT, this.rng);
      room.pendingVault = {
        cardIndex: action.cardIndex,
        playerId: player.id,
        tier,
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
      return fail("PROMPT_EXPIRED");
    }
    const offer = pending.offers.find((card) => card.id === chosenCardId);
    if (!offer) {
      return fail("INVALID_VAULT_CHOICE");
    }
    pending.chosenCardId = offer.id;
    const inputs = getResolverInputs(offer.id);
    const cost = inputs?.cost;
    if (cost && countMatchingCards(player.hand, cost.match) < cost.count) {
      return fail("CANNOT_PAY_CONDITION");
    }
    if (inputs?.color) {
      pending.colorRequired = true;
      this.scheduleTurn(room.id);
      this.emit({
        type: "prompt",
        gameId: room.id,
        playerId: player.id,
        kind: "choose-color",
      });
      return { ok: true, value: { log: [], won: false, nextPlayerId: null } };
    }
    const spec = inputs?.targets;
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
    const chosenCardId = pending.chosenCardId;
    const steal = chosenCardId ? getResolverInputs(chosenCardId)?.steal : undefined;
    if (steal) {
      if (this.availableCards(room, targetIds).length === 0) {
        pending.chosenCardIds = [];
        return this.completePlay(room, player, pending.cardIndex, undefined);
      }
      pending.stealSpec = steal;
      revealHands(room, player.id, targetIds, false);
      this.scheduleTurn(room.id);
      this.emit({
        type: "prompt",
        gameId: room.id,
        playerId: player.id,
        kind: "pick-cards",
        min: steal.min,
        max: steal.max,
        sourcePlayerIds: targetIds,
        perPlayer: steal.perPlayer,
      });
      return { ok: true, value: { log: [], won: false, nextPlayerId: null } };
    }
    return this.completePlay(room, player, pending.cardIndex, undefined);
  }

  private applyChooseCards(
    room: Room,
    player: Player,
    cardIds: string[] | undefined,
  ): RoomResult<ActionOutcome> {
    const pending = room.pendingVault;
    if (!pending || pending.playerId !== player.id) {
      return fail("INVALID_ACTION");
    }
    const spec = pending.stealSpec;
    if (!spec) {
      return fail("INVALID_ACTION");
    }
    const sources = pending.targetIds ?? [];
    const available = this.availableCards(room, sources);
    const effectiveMin = Math.min(spec.min, available.length);
    if (!cardIds || cardIds.length < effectiveMin || cardIds.length > spec.max) {
      return fail("INVALID_ACTION");
    }
    if (new Set(cardIds).size !== cardIds.length) {
      return fail("INVALID_ACTION");
    }
    const perSource = new Map<string, number>();
    for (const id of cardIds) {
      const holder = room.players.find(
        (candidate) =>
          sources.includes(candidate.id) && candidate.hand.some((card) => card.id === id),
      );
      if (!holder) {
        return fail("INVALID_ACTION");
      }
      perSource.set(holder.id, (perSource.get(holder.id) ?? 0) + 1);
    }
    if (spec.perPlayer) {
      for (const sourceId of sources) {
        const source = room.getPlayer(sourceId);
        const sourceSize = source?.hand.length ?? 0;
        const minHere = Math.min(spec.perPlayer.min, sourceSize);
        const count = perSource.get(sourceId) ?? 0;
        if (count < minHere || count > spec.perPlayer.max) {
          return fail("INVALID_ACTION");
        }
      }
    }
    pending.chosenCardIds = cardIds;
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
    this.pruneOneShotReveals(room, player.id);
    if (action.type === "play") {
      return this.applyPlay(room, player, action);
    }
    if (action.type === "choose-color") {
      return this.applyChooseColor(room, player, action.chosenColor);
    }
    if (action.type === "vault-choice") {
      return this.applyVaultChoice(room, player, action.cardId);
    }
    if (action.type === "choose-targets") {
      return this.applyChooseTargets(room, player, action.targetIds);
    }
    if (action.type === "choose-cards") {
      return this.applyChooseCards(room, player, action.cardIds);
    }
    if (action.type === "draw") {
      if (room.pendingWild || room.pendingVault) {
        return fail("DRAW_NOT_ALLOWED");
      }
      const result = applyDraw(room, this.rng);
      if (!result.ok) {
        return fail(result.error);
      }
      this.turnManager.cancelTurn(room.id);
      this.emit({
        type: "draw",
        gameId,
        playerId: player.id,
        playerName: player.name,
        count: result.value.drawn,
      });
      for (const message of result.value.log) {
        this.emit({ type: "log", gameId, message });
      }
      this.scheduleTurn(room.id);
      this.emitTurn(room);
      const nextPlayer = room.players[room.currentTurnIndex];
      return {
        ok: true,
        value: { log: result.value.log, won: false, nextPlayerId: nextPlayer?.id ?? null },
      };
    }
    return fail("INVALID_ACTION");
  }
}
