import type { PlayerView } from "../game/state.js";
import type { ErrorEnvelope, GameAction, LobbyPlayer, RoomSummary } from "./schemas.js";

export interface ClientToServerEvents {
  "rooms:list": () => void;
  "rooms:create": (payload: { name: string; playerName: string }) => void;
  "lobby:join": (payload: { gameId: string; playerName: string }) => void;
  "lobby:leave": (payload: { gameId: string; playerId: string }) => void;
  "game:start": (payload: { gameId: string }) => void;
  "game:action": (payload: GameAction) => void;
  "game:state:get": (payload: { gameId: string; playerId: string }) => void;
}

export interface ServerToClientEvents {
  "rooms:list:return": (rooms: RoomSummary[]) => void;
  "lobby:update": (players: LobbyPlayer[]) => void;
  "game:start:return": (payload: { ok: boolean; gameId?: string }) => void;
  "game:state": (state: PlayerView) => void;
  "game:log": (payload: { gameId: string; message: string }) => void;
  "game:turn": (payload: { gameId: string; playerIndex: number }) => void;
  error: (payload: ErrorEnvelope) => void;
}
