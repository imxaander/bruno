import type { Server, Socket } from "socket.io";
import {
  CreateRoomPayloadSchema,
  GameActionSchema,
  GetGameStateSchema,
  JoinRoomPayloadSchema,
  LeaveRoomSchema,
  StartGameSchema,
  type ClientToServerEvents,
  type ServerToClientEvents,
  type VaultOffer,
} from "@bruno/shared";
import type { Rng } from "../game/deck.js";
import {
  RoomManager,
  type EngineError,
  type RoomError,
  type RoomEvent,
  type StartGameOptions,
} from "../game/room-manager.js";
import type { TurnManager } from "../game/turn-manager.js";

export type BrunoServer = Server<ClientToServerEvents, ServerToClientEvents>;

type BrunoSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

interface SocketData {
  playerId?: string;
  roomId?: string;
}

export interface RegisterSocketsOptions {
  turnManager?: TurnManager;
  rng?: Rng;
  startOptions?: StartGameOptions;
}

const ERROR_MESSAGES: Record<RoomError, string> = {
  ROOM_NOT_FOUND: "Room not found.",
  ROOM_FULL: "This room is full.",
  ALREADY_IN_ROOM: "You are already in this room.",
  GAME_STARTED: "This game has already started.",
  NOT_IN_ROOM: "You are not in this room.",
  NOT_HOST: "Only the host can start the game.",
  NO_PLAYERS: "There are no players in this room.",
  INVALID_PLAYER: "Invalid player identity.",
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
  let rooms: RoomManager;

  const pushGameState = (gameId: string): void => {
    const sockets = roomSockets.get(gameId);
    if (!sockets) {
      return;
    }
    for (const socket of sockets) {
      const playerId = socket.data.playerId;
      if (!playerId) {
        continue;
      }
      const view = rooms.getPlayerView(gameId, playerId);
      if (view.ok) {
        socket.emit("game:state", view.value);
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
          });
        } else {
          socket.emit("game:prompt", { gameId: event.gameId, kind: "choose-color" });
        }
        return;
      }
    }
  };

  const emitGameEnded = (event: Extract<RoomEvent, { type: "ended" }>): void => {
    const room = rooms.getRoom(event.gameId);
    const players = room
      ? room.players.map((player) => ({
          id: player.id,
          name: player.name,
          handCount: player.hand.length,
        }))
      : [];
    io.to(event.gameId).emit("game:ended", {
      gameId: event.gameId,
      winner: event.winnerId ? { id: event.winnerId, name: event.winnerName } : null,
      players,
      reason: "hand_emptied",
    });
    pushGameState(event.gameId);
  };

  const handleEvent = (event: RoomEvent): void => {
    switch (event.type) {
      case "log":
        io.to(event.gameId).emit("game:log", { gameId: event.gameId, message: event.message });
        break;
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
        emitGameEnded(event);
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
  });

  const addToRoom = (roomId: string, socket: BrunoSocket): void => {
    let sockets = roomSockets.get(roomId);
    if (!sockets) {
      sockets = new Set();
      roomSockets.set(roomId, sockets);
    }
    sockets.add(socket);
  };

  const removeFromRoom = (roomId: string, socket: BrunoSocket): void => {
    const sockets = roomSockets.get(roomId);
    if (!sockets) {
      return;
    }
    sockets.delete(socket);
    if (sockets.size === 0) {
      roomSockets.delete(roomId);
    }
  };

  const refreshRooms = (): void => {
    io.emit("rooms:list:return", rooms.listRooms());
  };

  io.on("connection", (socket) => {
    console.log(`[socket] connected: ${socket.id}`);
    const data = socket.data as SocketData;

    socket.on("rooms:list", () => {
      socket.emit("rooms:list:return", rooms.listRooms());
    });

    socket.on("rooms:create", (payload) => {
      const parsed = CreateRoomPayloadSchema.safeParse(payload);
      if (!parsed.success) {
        emitError(socket, "INVALID_CREATE", "Invalid create-room payload.");
        return;
      }
      const result = rooms.createRoom(parsed.data);
      if (!result.ok) {
        emitFailure(socket, result.error);
        return;
      }
      data.playerId = parsed.data.playerId;
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
      const result = rooms.joinRoom(
        parsed.data.gameId,
        parsed.data.playerId,
        parsed.data.playerName,
      );
      if (!result.ok) {
        emitFailure(socket, result.error);
        return;
      }
      data.playerId = parsed.data.playerId;
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

    socket.on("game:state:get", (payload) => {
      const parsed = GetGameStateSchema.safeParse(payload);
      if (!parsed.success) {
        emitError(socket, "INVALID_STATE_GET", "Invalid state payload.");
        return;
      }
      const result = rooms.getPlayerView(parsed.data.gameId, parsed.data.playerId);
      if (!result.ok) {
        emitFailure(socket, result.error);
        return;
      }
      socket.emit("game:state", result.value);
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

    socket.on("disconnect", () => {
      console.log(`[socket] disconnected: ${socket.id}`);
      const roomId = data.roomId;
      const playerId = data.playerId;
      if (roomId && playerId) {
        const result = rooms.leaveRoom(roomId, playerId);
        if (result.ok && result.value) {
          io.to(roomId).emit("lobby:update", rooms.getLobbyPlayers(roomId) ?? []);
        }
        removeFromRoom(roomId, socket);
        refreshRooms();
      }
    });
  });

  return rooms;
}
