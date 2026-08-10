import { useCallback, useEffect, useState } from "react";
import type { ErrorEnvelope, PlayerView } from "@bruno/shared";
import { Button } from "../components/Button.js";
import { CardBack, CardFace } from "../components/Card.js";
import { Seat } from "../components/Seat.js";
import { TurnTimer } from "../components/TurnTimer.js";
import type { BrunoSocket } from "../socket/client.js";
import type { PlayerIdentity } from "../socket/useSocket.js";

interface GameProps {
  socket: BrunoSocket | null;
  identity: PlayerIdentity;
  roomId: string | null;
  goLobby: () => void;
}

export function Game({ socket, identity, roomId, goLobby }: GameProps) {
  const [view, setView] = useState<PlayerView | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!socket) {
      return;
    }
    const onState = (state: PlayerView) => setView(state);
    const onLog = (payload: { gameId: string; message: string }) =>
      setLog((prev) => [payload.message, ...prev].slice(0, 50));
    const onTurn = (payload: { gameId: string; playerIndex: number }) =>
      setView((prev) => (prev ? { ...prev, currentTurnIndex: payload.playerIndex } : prev));
    const onError = (payload: ErrorEnvelope) => setError(payload.message);
    socket.on("game:state", onState);
    socket.on("game:log", onLog);
    socket.on("game:turn", onTurn);
    socket.on("error", onError);
    if (roomId && identity.id) {
      socket.emit("game:state:get", { gameId: roomId, playerId: identity.id });
    }
    return () => {
      socket.off("game:state", onState);
      socket.off("game:log", onLog);
      socket.off("game:turn", onTurn);
      socket.off("error", onError);
    };
  }, [socket, roomId, identity.id]);

  const playCard = useCallback(
    (index: number) => {
      if (!roomId || !identity.id) {
        return;
      }
      socket?.emit("game:action", {
        gameId: roomId,
        type: "play",
        playerId: identity.id,
        cardIndex: index,
      });
    },
    [socket, roomId, identity.id],
  );

  const draw = useCallback(() => {
    if (!roomId || !identity.id) {
      return;
    }
    socket?.emit("game:action", { gameId: roomId, type: "draw", playerId: identity.id });
  }, [socket, roomId, identity.id]);

  if (!view) {
    return (
      <main className="page page-game">
        <p className="game-empty">Waiting for game state…</p>
        {error ? <p className="error-line">{error}</p> : null}
        <Button variant="secondary" onClick={goLobby}>
          Back to Lobby
        </Button>
      </main>
    );
  }

  const myTurn = view.currentTurnIndex === view.you.index;
  const opponents = view.players.filter((player) => player.id !== identity.id);
  const connected = socket?.connected ?? false;

  return (
    <main className="page page-game">
      <header className="page-header">
        <h2>Game</h2>
        <TurnTimer seconds={5} active={myTurn} />
        <span className="direction">{view.currentDirection === 1 ? "→" : "←"}</span>
        <span className={`conn-dot${connected ? "" : " conn-dot-off"}`} />
      </header>
      {error ? <p className="error-line">{error}</p> : null}

      <div className="board">
        <div className="opponents">
          {opponents.map((player) => (
            <Seat key={player.id} player={player} />
          ))}
        </div>
        <div className="center-area">
          <div className="deck-stack">
            <CardBack size="lg" count={view.deckCount} />
          </div>
          <div className="pile-stack">
            {view.pileTop ? <CardFace card={view.pileTop} size="lg" /> : <CardBack size="lg" />}
          </div>
        </div>
      </div>

      <div className="turn-area">
        <p className="turn-label">{myTurn ? "IT'S YOUR TURN!" : "Waiting…"}</p>
        <Button variant="secondary" onClick={draw}>
          DRAW
        </Button>
      </div>

      <div className="hand">
        {view.you.hand.map((card, index) => (
          <button
            key={card.id}
            className="hand-slot"
            disabled={!myTurn}
            onClick={() => playCard(index)}
          >
            <CardFace card={card} playable={myTurn} />
          </button>
        ))}
      </div>

      <div className="game-log panel">
        {log.length === 0 ? (
          <p className="log-empty">No events yet.</p>
        ) : (
          log.map((line, index) => (
            <p key={index} className="log-line">
              {line}
            </p>
          ))
        )}
      </div>
    </main>
  );
}
