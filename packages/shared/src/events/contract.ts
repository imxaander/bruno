import type { PlayerView } from "../game/state.js";
import type {
  CreateRoomPayload,
  ErrorEnvelope,
  GameAction,
  GameEffect,
  GameEndedPayload,
  GamePrompt,
  GetGameStatePayload,
  JoinRoomPayload,
  LeaveRoomPayload,
  LobbyPlayer,
  RoomCreateReturn,
  RoomSummary,
  StartGamePayload,
} from "./schemas.js";

export interface ClientToServerEvents {
  "rooms:list": () => void;
  "rooms:create": (payload: CreateRoomPayload) => void;
  "lobby:join": (payload: JoinRoomPayload) => void;
  "lobby:leave": (payload: LeaveRoomPayload) => void;
  "game:start": (payload: StartGamePayload) => void;
  "game:action": (payload: GameAction) => void;
  "game:state:get": (payload: GetGameStatePayload) => void;
}

export interface ServerToClientEvents {
  "rooms:list:return": (rooms: RoomSummary[]) => void;
  "rooms:create:return": (payload: RoomCreateReturn) => void;
  "lobby:update": (players: LobbyPlayer[]) => void;
  "game:start:return": (payload: { ok: boolean; gameId?: string }) => void;
  "game:state": (state: PlayerView) => void;
  "game:log": (payload: { gameId: string; message: string }) => void;
  "game:effect": (payload: GameEffect) => void;
  "game:turn": (payload: { gameId: string; playerIndex: number }) => void;
  "game:prompt": (payload: GamePrompt) => void;
  "game:ended": (payload: GameEndedPayload) => void;
  error: (payload: ErrorEnvelope) => void;
}
