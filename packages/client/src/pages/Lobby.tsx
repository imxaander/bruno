import { useEffect, useState } from "react";
import type { ErrorEnvelope, LobbyPlayer, PublicPlayer } from "@bruno/shared";
import { Button } from "../components/Button.js";
import { Seat } from "../components/Seat.js";
import type { BrunoSocket } from "../socket/client.js";
import type { PlayerIdentity } from "../socket/useSocket.js";

interface LobbyProps {
  socket: BrunoSocket | null;
  identity: PlayerIdentity;
  roomId: string | null;
  roomName: string;
  goRooms: () => void;
  goGame: (gameId: string) => void;
}

export function Lobby({ socket, identity, roomId, roomName, goRooms, goGame }: LobbyProps) {
  const [players, setPlayers] = useState<LobbyPlayer[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!socket) {
      return;
    }
    const onUpdate = (list: LobbyPlayer[]) => setPlayers(list);
    const onStart = (payload: { ok: boolean; gameId?: string }) => {
      if (payload.ok && payload.gameId) {
        goGame(payload.gameId);
      }
    };
    const onError = (payload: ErrorEnvelope) => setError(payload.message);
    socket.on("lobby:update", onUpdate);
    socket.on("game:start:return", onStart);
    socket.on("error", onError);
    return () => {
      socket.off("lobby:update", onUpdate);
      socket.off("game:start:return", onStart);
      socket.off("error", onError);
    };
  }, [socket, goGame]);

  const me = players.find((player) => player.id === identity.id);
  const seats = Array.from({ length: 8 }, (_, index) => players[index]);
  const connected = socket?.connected ?? false;

  const leave = () => {
    if (roomId && identity.id) {
      socket?.emit("lobby:leave", { gameId: roomId, playerId: identity.id });
    }
    goRooms();
  };

  const start = () => {
    if (roomId) {
      socket?.emit("game:start", { gameId: roomId });
    }
  };

  const toPublic = (player: LobbyPlayer): PublicPlayer => ({
    id: player.id,
    name: player.name,
    isHost: player.isHost,
    isTurn: false,
    handCount: 0,
  });

  return (
    <main className="page page-lobby">
      <header className="page-header">
        <h2>{roomName}</h2>
        <span className={`conn-dot${connected ? "" : " conn-dot-off"}`} />
      </header>
      {error ? <p className="error-line">{error}</p> : null}
      <div className="seat-grid">
        {seats.map((player, index) =>
          player ? (
            <Seat key={player.id} player={toPublic(player)} self={player.id === identity.id} />
          ) : (
            <div key={`empty-${index}`} className="seat seat-empty">
              <span className="seat-name">Waiting…</span>
            </div>
          ),
        )}
      </div>
      <div className="lobby-actions">
        <Button variant="secondary" onClick={leave}>
          Leave Game
        </Button>
        {me?.isHost ? (
          <Button variant="primary" onClick={start}>
            Start Game
          </Button>
        ) : null}
      </div>
    </main>
  );
}
