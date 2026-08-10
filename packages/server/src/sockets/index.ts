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
} from "@bruno/shared";
import { RoomManager, type EngineError, type RoomError } from "../game/room-manager.js";

export type BrunoServer = Server<ClientToServerEvents, ServerToClientEvents>;

type BrunoSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

interface SocketData {
  playerId?: string;
  roomId?: string;
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
  DRAW_NOT_ALLOWED: "Drawing is only automatic on turn timeout.",
  INVALID_ACTION: "That action is not valid.",
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

export function registerSockets(io: BrunoServer): void {
  const rooms = new RoomManager();

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
      const room = result.value;
      const gameId = room.id;
      const firstPlayer = room.players[room.currentTurnIndex];
      io.to(gameId).emit("game:start:return", { ok: true, gameId });
      io.to(gameId).emit("game:log", { gameId, message: "The game has started." });
      io.to(gameId).emit("game:log", {
        gameId,
        message: `It's ${firstPlayer?.name ?? "someone"}'s turn...`,
      });
      io.to(gameId).emit("game:turn", { gameId, playerIndex: room.currentTurnIndex });
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
      emitError(
        socket,
        "NOT_IMPLEMENTED",
        `Game actions are not implemented yet (${parsed.data.type}).`,
      );
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
        refreshRooms();
      }
    });
  });
}
