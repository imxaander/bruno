import type { PlayerView } from "../game/state.js";
import type {
  AuthVerifyPayload,
  CreateRoomPayload,
  ErrorEnvelope,
  GameAction,
  GameAlert,
  GameEffect,
  GameEndedPayload,
  GamePrompt,
  GetGameStatePayload,
  JoinRoomPayload,
  LeaderboardReturn,
  LeaveRoomPayload,
  LobbyPlayer,
  RoomCreateReturn,
  RoomSummary,
  StartGamePayload,
  VaultCatalogReturn,
} from "./schemas.js";

export interface ClientToServerEvents {
  "rooms:list": () => void;
  "rooms:create": (payload: CreateRoomPayload) => void;
  "lobby:join": (payload: JoinRoomPayload) => void;
  "lobby:leave": (payload: LeaveRoomPayload) => void;
  "game:start": (payload: StartGamePayload) => void;
  "game:action": (payload: GameAction) => void;
  "game:rejoin": (payload: { gameId: string; playerId: string }) => void;
  "game:state:get": (payload: GetGameStatePayload) => void;
  "vault:catalog:get": () => void;
  "auth:verify": (payload: AuthVerifyPayload) => void;
  "leaderboard:get": () => void;
  "shop:buy": (payload: { itemId: string }) => void;
  "shop:equip": (payload: { itemId: string }) => void;
  "daily:claim": () => void;
}

export interface ServerToClientEvents {
  "rooms:list:return": (rooms: RoomSummary[]) => void;
  "rooms:create:return": (payload: RoomCreateReturn) => void;
  "lobby:update": (players: LobbyPlayer[]) => void;
  "game:start:return": (payload: { ok: boolean; gameId?: string }) => void;
  "game:state": (state: PlayerView) => void;
  "game:log": (payload: { gameId: string; message: string }) => void;
  "game:draw": (payload: {
    gameId: string;
    playerId: string;
    playerName: string;
    count: number;
  }) => void;
  "game:effect": (payload: GameEffect) => void;
  "game:turn": (payload: { gameId: string; playerIndex: number; playerId: string }) => void;
  "game:prompt": (payload: GamePrompt) => void;
  "game:alert": (payload: GameAlert) => void;
  "game:ended": (payload: GameEndedPayload) => void;
  "vault:catalog:return": (payload: VaultCatalogReturn) => void;
  "leaderboard:return": (payload: LeaderboardReturn) => void;
  "shop:purchase:ok": (payload: { itemId: string; coins: number }) => void;
  "shop:equip:ok": (payload: { equippedCardBack: string; equippedBackground: string }) => void;
  "daily:claim:return": (payload: { reward: number; streak: number }) => void;
  error: (payload: ErrorEnvelope) => void;
}
