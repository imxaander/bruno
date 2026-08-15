import type { Server, Socket } from "socket.io";
import {
  AuthVerifySchema,
  CreateRoomPayloadSchema,
  GameActionSchema,
  GetGameStateSchema,
  JoinRoomPayloadSchema,
  LeaveRoomSchema,
  RejoinRoomSchema,
  StartGameSchema,
  calculatePointChanges,
  getCard,
  getRankTier,
  type ClientToServerEvents,
  type PlayerView,
  type PointChange,
  type ServerToClientEvents,
  type VaultOffer,
} from "@bruno/shared";
import type { Rng } from "../game/deck.js";
import {
  RoomManager,
  RECONNECT_GRACE_MS,
  type EngineError,
  type RoomError,
  type RoomEvent,
  type StartGameOptions,
} from "../game/room-manager.js";
import { registeredResolverIds } from "../game/effects/registry.js";
import type { TurnManager } from "../game/turn-manager.js";
import { getAuth } from "../firebase/admin.js";
import { getDb } from "../firebase/firestore.js";
import { applyGameEndScores } from "../firebase/profileScoring.js";

export type BrunoServer = Server<ClientToServerEvents, ServerToClientEvents>;

type BrunoSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

interface SocketData {
  playerId?: string;
  roomId?: string;
  uid?: string; // Firebase UID when authenticated
}

export interface RegisterSocketsOptions {
  turnManager?: TurnManager;
  rng?: Rng;
  startOptions?: StartGameOptions;
  /** Minimum seated players required to start a game (default 1). */
  minPlayers?: number;
}

const ERROR_MESSAGES: Record<RoomError, string> = {
  ROOM_NOT_FOUND: "Room not found.",
  ROOM_FULL: "This room is full.",
  ALREADY_IN_ROOM: "You are already in this room.",
  GAME_STARTED: "This game has already started.",
  NOT_IN_ROOM: "You are not in this room.",
  NOT_HOST: "Only the host can start the game.",
  INVALID_PLAYER: "Invalid player identity.",
  NEED_MORE_PLAYERS: "At least 3 players are needed to start a game.",
  INVALID_MAX_PLAYERS: "A room must be created for at least 3 players.",
};

const ENGINE_ERROR_MESSAGES: Record<EngineError, string> = {
  NOT_YOUR_TURN: "It is not your turn.",
  INVALID_CARD: "That card is not in your hand.",
  CARD_NOT_PLAYABLE: "That card cannot be played.",
  CHOOSE_COLOR_REQUIRED: "Choose a color to play that card.",
  GAME_NOT_ACTIVE: "The game is not in progress.",
  DRAW_NOT_ALLOWED: "You cannot draw right now — play a card (or choose a color) first.",
  INVALID_ACTION: "That action is not valid.",
  CANNOT_PAY_CONDITION: "You cannot play that effect — the required cards are not in your hand.",
  PROMPT_EXPIRED: "That prompt has expired — the effect was auto-resolved.",
  INVALID_VAULT_CHOICE: "That vault effect is no longer available.",
};

function emitError(socket: BrunoSocket, code: string, message: string): void {
  socket.emit("error", { ok: false, code, message });
}

function emitFailure(socket: BrunoSocket, code: RoomError | EngineError): void {
  const messages: Record<RoomError | EngineError, string> = {
    ...ERROR_MESSAGES,
    ...ENGINE_ERROR_MESSAGES,
  };
  emitError(socket, code, messages[code] ?? code);
}

export function registerSockets(
  io: BrunoServer,
  options: RegisterSocketsOptions = {},
): RoomManager {
  const roomSockets = new Map<string, Set<BrunoSocket>>();
  const socketDataByPlayer = new Map<string, SocketData>(); // playerId -> SocketData
  let rooms: RoomManager;

  // playerId -> { rankIcon, rankName, profileIcon }, cached briefly per room to
  // avoid a Firestore read on every state push. Freshness of ~30s is fine (ranks
  // only change after games).
  type PlayerMeta = Record<string, { rankIcon: string; rankName: string; profileIcon: string }>;
  const metaCache = new Map<string, { at: number; meta: PlayerMeta }>();
  const META_TTL_MS = 30_000;

  const withMeta = (view: PlayerView, meta: PlayerMeta): PlayerView => {
    if (Object.keys(meta).length === 0) {
      return view;
    }
    return {
      ...view,
      players: view.players.map((player) => {
        const m = meta[player.id];
        return m
          ? {
              ...player,
              profileIcon: m.profileIcon || undefined,
              rankIcon: m.rankIcon,
              rankName: m.rankName,
            }
          : player;
      }),
    };
  };

  const fetchMeta = async (gameId: string): Promise<PlayerMeta> => {
    const cached = metaCache.get(gameId);
    if (cached && Date.now() - cached.at < META_TTL_MS) {
      return cached.meta;
    }
    const room = rooms.getRoom(gameId);
    const db = getDb();
    if (!room || !db) {
      return {};
    }
    const meta: PlayerMeta = {};
    await Promise.all(
      room.players.map(async (player) => {
        try {
          const snap = await db.collection("profiles").doc(player.id).get();
          const data = snap.exists ? snap.data() : null;
          if (!data) {
            return;
          }
          const points = typeof data.points === "number" ? data.points : 0;
          const tier = getRankTier(points);
          meta[player.id] = {
            rankIcon: tier.icon,
            rankName: tier.name,
            profileIcon: typeof data.icon === "string" ? data.icon : "",
          };
        } catch {
          // Profile unreadable (rules/permissions) — player shows no rank/avatar.
        }
      }),
    );
    metaCache.set(gameId, { at: Date.now(), meta });
    return meta;
  };

  const pushGameState = async (gameId: string): Promise<void> => {
    const sockets = roomSockets.get(gameId);
    if (!sockets) {
      return;
    }
    const meta = await fetchMeta(gameId);
    for (const socket of sockets) {
      const playerId = socket.data.playerId;
      if (!playerId) {
        continue;
      }
      const view = rooms.getPlayerView(gameId, playerId);
      if (view.ok) {
        socket.emit("game:state", withMeta(view.value, meta));
      }
    }
  };

  const emitPrompt = (event: Extract<RoomEvent, { type: "prompt" }>): void => {
    const sockets = roomSockets.get(event.gameId);
    if (!sockets) {
      return;
    }
    for (const socket of sockets) {
      if (socket.data.playerId === event.playerId) {
        if (event.kind === "vault-choice") {
          socket.emit("game:prompt", {
            gameId: event.gameId,
            kind: "vault-choice",
            offers: event.offers.map((card): VaultOffer => ({
              id: card.id,
              name: card.name,
              type: card.type as VaultOffer["type"],
              effect: card.effect,
              playCondition: card.playCondition,
            })),
          });
        } else if (event.kind === "pick-players") {
          socket.emit("game:prompt", {
            gameId: event.gameId,
            kind: "pick-players",
            min: event.min,
            max: event.max,
            allowSelf: event.allowSelf,
          });
        } else if (event.kind === "pick-cards") {
          socket.emit("game:prompt", {
            gameId: event.gameId,
            kind: "pick-cards",
            min: event.min,
            max: event.max,
            sourcePlayerIds: event.sourcePlayerIds,
            perPlayer: event.perPlayer,
            selfHand: event.selfHand,
            excludedCardId: event.excludedCardId,
          });
        } else {
          socket.emit("game:prompt", { gameId: event.gameId, kind: "choose-color" });
        }
        return;
      }
    }
  };

  const emitGameEnded = async (event: Extract<RoomEvent, { type: "ended" }>): Promise<void> => {
    const room = rooms.getRoom(event.gameId);
    const meta = await fetchMeta(event.gameId);
    const players = room
      ? room.players.map((player) => ({
          id: player.id,
          name: player.name,
          handCount: player.hand.length,
          icon: meta[player.id]?.profileIcon ?? null,
        }))
      : [];

    // Calculate and apply rank point changes. Guests (no uid) score nothing.
    const scoringPlayers = room
      ? room.players.map((player) => ({
          uid: socketDataByPlayer.get(player.id)?.uid ?? null,
          isWinner: player.id === event.winnerId,
          cardsRemaining: player.hand.length,
          vaultCardsUsed: player.playedEffectIds?.filter((id) => id.startsWith("t")).length ?? 0,
          currentPoints: 0, // real total read from Firestore inside applyGameEndScores
        }))
      : [];
    let changes: PointChange[];
    let pointsConfigured = false;
    try {
      changes = await applyGameEndScores(scoringPlayers);
      pointsConfigured = getDb() !== null;
    } catch {
      // Firestore unavailable — still report deltas, but no persisted totals.
      changes = calculatePointChanges(scoringPlayers);
    }
    const changeByUid = new Map(changes.map((change) => [change.uid, change]));

    io.to(event.gameId).emit("game:ended", {
      gameId: event.gameId,
      winner: event.winnerId ? { id: event.winnerId, name: event.winnerName } : null,
      players: players.map((player) => {
        const change = changeByUid.get(player.id);
        return {
          ...player,
          pointsDelta: change?.delta ?? 0,
          points: change && pointsConfigured ? change.newPoints : null,
          rankName: change && pointsConfigured ? change.newTier : null,
        };
      }),
      reason: "hand_emptied",
    });
    // Ranks change after scoring — drop the cache so the next push is fresh.
    metaCache.delete(event.gameId);
    pushGameState(event.gameId);
  };

  const handleEvent = (event: RoomEvent): void => {
    switch (event.type) {
      case "log":
        io.to(event.gameId).emit("game:log", { gameId: event.gameId, message: event.message });
        break;
      case "alert": {
        const sockets = roomSockets.get(event.gameId);
        if (sockets) {
          for (const socket of sockets) {
            if (socket.data.playerId === event.playerId) {
              socket.emit("game:alert", { gameId: event.gameId, message: event.message });
            }
          }
        }
        break;
      }
      case "draw":
        io.to(event.gameId).emit("game:draw", {
          gameId: event.gameId,
          playerId: event.playerId,
          playerName: event.playerName,
          count: event.count,
        });
        break;
      case "effect":
        io.to(event.gameId).emit("game:effect", {
          gameId: event.gameId,
          playerId: event.playerId,
          playerName: event.playerName,
          cardId: event.cardId,
          name: event.name,
          tier: event.tier,
          text: event.text,
          lines: event.lines,
          targetNames: event.targetNames,
        });
        break;
      case "turn":
        io.to(event.gameId).emit("game:turn", {
          gameId: event.gameId,
          playerIndex: event.playerIndex,
          playerId: event.playerId,
        });
        pushGameState(event.gameId);
        break;
      case "ended":
        void emitGameEnded(event);
        break;
      case "prompt":
        emitPrompt(event);
        break;
    }
  };

  rooms = new RoomManager({
    eventSink: handleEvent,
    turnManager: options.turnManager,
    rng: options.rng,
    startOptions: options.startOptions,
    minPlayers: options.minPlayers,
  });

  const addToRoom = (roomId: string, socket: BrunoSocket): void => {
    let sockets = roomSockets.get(roomId);
    if (!sockets) {
      sockets = new Set();
      roomSockets.set(roomId, sockets);
    }
    sockets.add(socket);
    if (socket.data.playerId) {
      socketDataByPlayer.set(socket.data.playerId, socket.data);
    }
  };

  const removeFromRoom = (roomId: string, socket: BrunoSocket): void => {
    const sockets = roomSockets.get(roomId);
    if (!sockets) {
      return;
    }
    sockets.delete(socket);
    if (socket.data.playerId) {
      socketDataByPlayer.delete(socket.data.playerId);
    }
    if (sockets.size === 0) {
      roomSockets.delete(roomId);
    }
  };

  const refreshRooms = (): void => {
    io.emit("rooms:list:return", rooms.listRooms());
  };

  io.on("connection", async (socket) => {
    console.log(`[socket] connected: ${socket.id}`);
    const data = socket.data as SocketData;

    // Verify Firebase token if present. Anonymous tokens still decode, but guests
    // (anonymous auth) are skipped by rank/scoring — only verified non-anonymous
    // tokens become an authoritative uid.
    const serverAuth = getAuth();
    const socketAuth = socket as typeof socket & { auth?: Record<string, unknown> };
    if (serverAuth && socketAuth.auth?.token && typeof socketAuth.auth.token === "string") {
      try {
        const decoded = await serverAuth.verifyIdToken(socketAuth.auth.token as string);
        if (decoded.firebase?.sign_in_provider !== "anonymous") {
          data.uid = decoded.uid;
          data.playerId = decoded.uid; // Use uid as authoritative playerId
        }
      } catch {
        // Invalid token — treat as guest
      }
    }

    socket.on("auth:verify", (payload) => {
      const parsed = AuthVerifySchema.safeParse(payload);
      if (!parsed.success) {
        return;
      }
      const auth = getAuth();
      if (!auth) {
        return;
      }
      auth
        .verifyIdToken(parsed.data.token)
        .then((decoded) => {
          if (decoded.firebase?.sign_in_provider === "anonymous") {
            return;
          }
          // socketDataByPlayer holds a reference to socket.data, so mutating uid here
          // is reflected in the game-end scoring lookup. Don't touch playerId — the
          // seat may be keyed by a guest id this socket created before signing in.
          data.uid = decoded.uid;
        })
        .catch(() => {
          // Invalid token — stay a guest
        });
    });

    socket.on("rooms:list", () => {
      socket.emit("rooms:list:return", rooms.listRooms());
    });

    socket.on("rooms:create", (payload) => {
      const parsed = CreateRoomPayloadSchema.safeParse(payload);
      if (!parsed.success) {
        emitError(socket, "INVALID_CREATE", "Invalid create-room payload.");
        return;
      }
      // Override playerId with authenticated uid when available
      const playerId = data.uid ?? parsed.data.playerId;
      const createPayload = { ...parsed.data, playerId };
      const result = rooms.createRoom(createPayload);
      if (!result.ok) {
        emitFailure(socket, result.error);
        return;
      }
      data.playerId = playerId;
      data.roomId = result.value.id;
      socket.join(result.value.id);
      addToRoom(result.value.id, socket);
      socket.emit("rooms:create:return", {
        ok: true,
        gameId: result.value.id,
        name: result.value.name,
        maxPlayers: result.value.maxPlayers,
      });
      io.to(result.value.id).emit("lobby:update", rooms.getLobbyPlayers(result.value.id) ?? []);
      refreshRooms();
    });

    socket.on("lobby:join", (payload) => {
      const parsed = JoinRoomPayloadSchema.safeParse(payload);
      if (!parsed.success) {
        emitError(socket, "INVALID_JOIN", "Invalid join payload.");
        return;
      }
      // Override playerId with authenticated uid when available
      const playerId = data.uid ?? parsed.data.playerId;
      const result = rooms.joinRoom(parsed.data.gameId, playerId, parsed.data.playerName);
      if (!result.ok) {
        emitFailure(socket, result.error);
        return;
      }
      data.playerId = playerId;
      data.roomId = result.value.id;
      socket.join(result.value.id);
      addToRoom(result.value.id, socket);
      io.to(result.value.id).emit("lobby:update", rooms.getLobbyPlayers(result.value.id) ?? []);
      refreshRooms();
    });

    socket.on("lobby:leave", (payload) => {
      const parsed = LeaveRoomSchema.safeParse(payload);
      if (!parsed.success) {
        emitError(socket, "INVALID_LEAVE", "Invalid leave payload.");
        return;
      }
      const result = rooms.leaveRoom(parsed.data.gameId, parsed.data.playerId);
      if (!result.ok) {
        emitFailure(socket, result.error);
        return;
      }
      if (data.roomId === parsed.data.gameId) {
        socket.leave(parsed.data.gameId);
        removeFromRoom(parsed.data.gameId, socket);
        data.roomId = undefined;
        data.playerId = undefined;
      }
      if (result.value) {
        io.to(parsed.data.gameId).emit(
          "lobby:update",
          rooms.getLobbyPlayers(parsed.data.gameId) ?? [],
        );
      }
      refreshRooms();
    });

    socket.on("game:start", (payload) => {
      const parsed = StartGameSchema.safeParse(payload);
      if (!parsed.success) {
        emitError(socket, "INVALID_START", "Invalid start payload.");
        return;
      }
      const result = rooms.startGame(parsed.data.gameId, parsed.data.playerId);
      if (!result.ok) {
        emitFailure(socket, result.error);
        return;
      }
      io.to(parsed.data.gameId).emit("game:start:return", {
        ok: true,
        gameId: parsed.data.gameId,
      });
    });

    socket.on("game:state:get", async (payload) => {
      const parsed = GetGameStateSchema.safeParse(payload);
      if (!parsed.success) {
        emitError(socket, "INVALID_STATE_GET", "Invalid state payload.");
        return;
      }
      // Override playerId with authenticated uid when available
      const playerId = data.uid ?? parsed.data.playerId;
      const result = rooms.getPlayerView(parsed.data.gameId, playerId);
      if (!result.ok) {
        emitFailure(socket, result.error);
        return;
      }
      const meta = await fetchMeta(parsed.data.gameId);
      socket.emit("game:state", withMeta(result.value, meta));
    });

    socket.on("game:action", (payload) => {
      const parsed = GameActionSchema.safeParse(payload);
      if (!parsed.success) {
        emitError(socket, "INVALID_ACTION", "Action payload failed validation.");
        return;
      }
      const result = rooms.performAction(parsed.data.gameId, parsed.data.playerId, parsed.data);
      if (!result.ok) {
        emitFailure(socket, result.error);
        return;
      }
      pushGameState(parsed.data.gameId);
    });

    socket.on("game:rejoin", async (payload) => {
      const parsed = RejoinRoomSchema.safeParse(payload);
      if (!parsed.success) {
        emitError(socket, "INVALID_REJOIN", "Invalid rejoin payload.");
        return;
      }
      // Override playerId with authenticated uid when available
      const playerId = data.uid ?? parsed.data.playerId;
      const result = rooms.rejoinPlayer(parsed.data.gameId, playerId);
      if (!result.ok) {
        emitFailure(socket, result.error);
        return;
      }
      data.roomId = parsed.data.gameId;
      data.playerId = playerId;
      socket.join(parsed.data.gameId);
      addToRoom(parsed.data.gameId, socket);
      const meta = await fetchMeta(parsed.data.gameId);
      socket.emit("game:state", withMeta(result.value, meta));
      io.to(parsed.data.gameId).emit(
        "lobby:update",
        rooms.getLobbyPlayers(parsed.data.gameId) ?? [],
      );
    });

    socket.on("vault:catalog:get", () => {
      const implemented = registeredResolverIds()
        .map((cardId) => getCard(cardId))
        .filter(
          (card): card is NonNullable<typeof card> =>
            card !== undefined &&
            (card.type === "vault-silver" ||
              card.type === "vault-gold" ||
              card.type === "vault-diamond"),
        )
        .map((card) => ({
          id: card.id,
          name: card.name,
          type: card.type as VaultOffer["type"],
          effect: card.effect,
          status: card.status,
          playCondition: card.playCondition,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      socket.emit("vault:catalog:return", { implemented });
    });

    socket.on("disconnect", () => {
      console.log(`[socket] disconnected: ${socket.id}`);
      const roomId = data.roomId;
      const playerId = data.playerId;
      if (roomId && playerId) {
        rooms.disconnectPlayer(roomId, playerId, RECONNECT_GRACE_MS);
        removeFromRoom(roomId, socket);
        refreshRooms();
      }
    });
  });

  return rooms;
}
