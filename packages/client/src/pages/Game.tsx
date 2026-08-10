import { useCallback, useEffect, useState, type CSSProperties } from "react";
import type { ErrorEnvelope, GameEndedPayload, GamePrompt, PlayerView } from "@bruno/shared";
import { Button } from "../components/Button.js";
import { Seat } from "../components/Seat.js";
import { TurnTimer } from "../components/TurnTimer.js";
import { PlayerHand } from "../components/board/PlayerHand.js";
import { TableOval } from "../components/board/TableOval.js";
import {
  ColorPicker,
  TargetPicker,
  VaultPicker,
  type CardColorName,
} from "../components/modals.js";
import type { BrunoSocket } from "../socket/client.js";
import type { PlayerIdentity } from "../socket/useSocket.js";

interface GameProps {
  socket: BrunoSocket | null;
  identity: PlayerIdentity;
  roomId: string | null;
  goLobby: () => void;
  onEnded: (payload: GameEndedPayload) => void;
}

// Fixed seat positions for the 8-player ring (clockwise from bottom-left).
// S2=left-lower, S3=left-upper, S4=top-left, S5=top-center, S6=top-right, S7=right-upper, S8=right-lower.
const SEATS_8P: CSSProperties[] = [
  { top: "52%", left: "1%" },
  { top: "18%", left: "1%" },
  { top: "3%", left: "16%" },
  { top: "1%", left: "50%", transform: "translateX(-50%)" },
  { top: "3%", left: "70%" },
  { top: "18%", right: "1%" },
  { top: "52%", right: "1%" },
];

export function Game({ socket, identity, roomId, goLobby, onEnded }: GameProps) {
  const [view, setView] = useState<PlayerView | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [prompt, setPrompt] = useState<GamePrompt | null>(null);
  const [remaining, setRemaining] = useState(0);

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
    const onPrompt = (payload: GamePrompt) => {
      if (payload.gameId === roomId) {
        setPrompt(payload);
      }
    };
    const onEndedEvent = (payload: GameEndedPayload) => {
      if (payload.gameId === roomId) {
        onEnded(payload);
      }
    };
    socket.on("game:state", onState);
    socket.on("game:log", onLog);
    socket.on("game:turn", onTurn);
    socket.on("error", onError);
    socket.on("game:prompt", onPrompt);
    socket.on("game:ended", onEndedEvent);
    if (roomId && identity.id) {
      socket.emit("game:state:get", { gameId: roomId, playerId: identity.id });
    }
    return () => {
      socket.off("game:state", onState);
      socket.off("game:log", onLog);
      socket.off("game:turn", onTurn);
      socket.off("error", onError);
      socket.off("game:prompt", onPrompt);
      socket.off("game:ended", onEndedEvent);
    };
  }, [socket, roomId, identity.id, onEnded]);

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

  const chooseColor = useCallback(
    (color: CardColorName) => {
      if (!roomId || !identity.id) {
        return;
      }
      socket?.emit("game:action", {
        gameId: roomId,
        type: "choose-color",
        playerId: identity.id,
        chosenColor: color,
      });
      setPrompt(null);
    },
    [socket, roomId, identity.id],
  );

  const chooseVault = useCallback(
    (cardId: string) => {
      if (!roomId || !identity.id) {
        return;
      }
      socket?.emit("game:action", {
        gameId: roomId,
        type: "vault-choice",
        playerId: identity.id,
        cardId,
      });
      setPrompt(null);
    },
    [socket, roomId, identity.id],
  );

  const chooseTargets = useCallback(
    (targetIds: string[]) => {
      if (!roomId || !identity.id) {
        return;
      }
      socket?.emit("game:action", {
        gameId: roomId,
        type: "choose-targets",
        playerId: identity.id,
        targetIds,
      });
      setPrompt(null);
    },
    [socket, roomId, identity.id],
  );

  const draw = useCallback(() => {
    if (!roomId || !identity.id) {
      return;
    }
    socket?.emit("game:action", { gameId: roomId, type: "draw", playerId: identity.id });
  }, [socket, roomId, identity.id]);

  const turnDuration = view?.turnDuration ?? 7;
  const myTurn = view ? view.currentTurnIndex === view.you.index : false;
  const canDraw =
    view != null && myTurn && !prompt && (view.pendingDraw > 0 || !view.you.playable.some(Boolean));

  useEffect(() => {
    setRemaining(turnDuration);
  }, [turnDuration, view?.currentTurnIndex, prompt]);

  useEffect(() => {
    if (!myTurn) {
      return;
    }
    const id = window.setInterval(() => {
      setRemaining((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [myTurn, view?.currentTurnIndex]);

  if (!view) {
    return (
      <div
        style={{
          width: "100%",
          minHeight: "100vh",
          background: "radial-gradient(ellipse at 50% 40%, #0c0c1a 0%, #080810 60%, #060610 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          fontFamily: "'Rajdhani', sans-serif",
          color: "rgba(200,216,240,0.45)",
        }}
      >
        <p style={{ margin: 0, fontSize: 14, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          Waiting for game state…
        </p>
        {error ? <p style={{ margin: 0, color: "#ff00cc", fontSize: 13 }}>{error}</p> : null}
        <Button variant="ghost" size="sm" onClick={goLobby}>
          Back to Lobby
        </Button>
      </div>
    );
  }

  const opponents = view.players.filter((player) => player.id !== identity.id);
  const connected = socket?.connected ?? false;
  const isRing = view.playerCount > 4;

  const header = (
    <div
      style={{
        height: 52,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
        gap: 16,
        background: "rgba(7,7,12,0.98)",
        borderBottom: "1px solid rgba(0,238,255,0.07)",
      }}
    >
      <span
        style={{
          fontFamily: "'Barlow Condensed'",
          fontWeight: 900,
          fontSize: 22,
          color: "#00eeff",
          textShadow: "0 0 14px rgba(0,238,255,0.7)",
          letterSpacing: "0.06em",
        }}
      >
        BRUNO
      </span>
      <div style={{ width: 1, height: 20, background: "rgba(0,238,255,0.15)" }} />
      <span
        style={{
          fontSize: 13,
          color: "rgba(200,216,240,0.45)",
          fontWeight: 600,
          letterSpacing: "0.04em",
        }}
      >
        {roomId ?? "room"}
      </span>
      <div
        style={{
          background: "rgba(0,238,255,0.1)",
          border: "1px solid rgba(0,238,255,0.22)",
          borderRadius: 4,
          padding: "2px 10px",
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, color: "#00eeff", letterSpacing: "0.14em" }}>
          {view.playerCount}P
        </span>
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: connected ? "#00e676" : "rgba(200,216,240,0.3)",
            boxShadow: connected ? "0 0 8px rgba(0,230,118,0.8)" : "none",
            animation: connected ? "neon-pulse 2s ease-in-out infinite" : undefined,
          }}
        />
        <span
          style={{
            fontSize: 12,
            color: connected ? "rgba(0,230,118,0.8)" : "rgba(200,216,240,0.3)",
            letterSpacing: "0.1em",
            fontWeight: 600,
          }}
        >
          {connected ? "LIVE" : "OFF"}
        </span>
      </div>
      <button
        onClick={() => setLogOpen((open) => !open)}
        style={{
          padding: "5px 14px",
          fontFamily: "'Rajdhani'",
          fontWeight: 600,
          fontSize: 12,
          background: "transparent",
          color: logOpen ? "#00eeff" : "rgba(200,216,240,0.4)",
          border: `1px solid ${logOpen ? "rgba(0,238,255,0.4)" : "rgba(200,216,240,0.1)"}`,
          borderRadius: 5,
          cursor: "pointer",
          letterSpacing: "0.08em",
        }}
      >
        LOG
      </button>
      <button
        onClick={goLobby}
        style={{
          padding: "5px 14px",
          fontFamily: "'Rajdhani'",
          fontWeight: 600,
          fontSize: 12,
          background: "transparent",
          color: "rgba(255,60,80,0.6)",
          border: "1px solid rgba(255,60,80,0.25)",
          borderRadius: 5,
          cursor: "pointer",
          letterSpacing: "0.08em",
        }}
      >
        LEAVE
      </button>
    </div>
  );

  const timerControls = (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <TurnTimer seconds={Math.ceil(remaining)} active={myTurn} total={turnDuration} />
      {myTurn ? (
        <Button
          variant="outline"
          size="sm"
          onClick={draw}
          disabled={!canDraw}
          style={{
            color: canDraw ? "#ffaa00" : "rgba(200,216,240,0.3)",
            borderColor: canDraw ? "rgba(255,170,0,0.35)" : "rgba(200,216,240,0.1)",
            padding: "10px 22px",
            fontSize: 17,
            boxShadow: canDraw ? "0 0 12px rgba(255,170,0,0.2)" : "none",
            cursor: canDraw ? "pointer" : "not-allowed",
          }}
        >
          DRAW
        </Button>
      ) : null}
    </div>
  );

  const meLabel = (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: "#aaff00",
          boxShadow: "0 0 6px rgba(170,255,0,0.8)",
        }}
      />
      <span
        style={{
          fontFamily: "'Rajdhani'",
          fontWeight: 700,
          fontSize: 10,
          color: "rgba(170,255,0,0.65)",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
        }}
      >
        Seat 1 · You
      </span>
      <div
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: "#aaff00",
          boxShadow: "0 0 6px rgba(170,255,0,0.8)",
        }}
      />
    </div>
  );

  const logPanel = logOpen ? (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        maxHeight: 180,
        overflowY: "auto",
        background: "rgba(7,7,12,0.97)",
        borderTop: "1px solid rgba(0,238,255,0.15)",
        padding: "12px 24px",
        fontFamily: "'Rajdhani', sans-serif",
      }}
    >
      {log.length === 0 ? (
        <p style={{ margin: 0, fontSize: 12, color: "rgba(200,216,240,0.4)" }}>No events yet.</p>
      ) : (
        log.map((line, index) => (
          <p key={index} style={{ margin: "2px 0", fontSize: 12, color: "rgba(200,216,240,0.6)" }}>
            {line}
          </p>
        ))
      )}
    </div>
  ) : null;

  const board = isRing ? (
    <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
      {opponents.map((player, i) => (
        <div key={player.id} style={{ position: "absolute", zIndex: 2, ...SEATS_8P[i] }}>
          <Seat player={player} compact />
        </div>
      ))}

      <div
        style={{
          position: "absolute",
          top: "36%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 1,
          width: "58%",
        }}
      >
        <TableOval
          deckCount={view.deckCount}
          pileTop={view.pileTop}
          direction={view.currentDirection}
          pendingDraw={view.pendingDraw}
          activeColor={view.activeColor}
        />
      </div>

      <div
        style={{
          position: "absolute",
          top: "36%",
          right: "11%",
          transform: "translateY(-50%)",
          zIndex: 3,
        }}
      >
        {timerControls}
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 204,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 2,
        }}
      >
        {meLabel}
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 2,
        }}
      >
        <PlayerHand
          hand={view.you.hand}
          playable={view.you.playable}
          myTurn={myTurn}
          onPlay={playCard}
        />
      </div>
    </div>
  ) : (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: 32,
          padding: "22px 120px 18px",
          flexShrink: 0,
        }}
      >
        {opponents.map((player) => (
          <Seat key={player.id} player={player} />
        ))}
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 60px",
          position: "relative",
        }}
      >
        <TableOval
          deckCount={view.deckCount}
          pileTop={view.pileTop}
          direction={view.currentDirection}
          pendingDraw={view.pendingDraw}
          activeColor={view.activeColor}
        />
        <div style={{ position: "absolute", right: 60, top: "50%", transform: "translateY(-50%)" }}>
          {timerControls}
        </div>
      </div>
      <div style={{ flexShrink: 0 }}>
        <PlayerHand
          hand={view.you.hand}
          playable={view.you.playable}
          myTurn={myTurn}
          onPlay={playCard}
        />
      </div>
    </div>
  );

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        background: "radial-gradient(ellipse at 50% 40%, #0c0c1a 0%, #080810 60%, #060610 100%)",
        fontFamily: "'Rajdhani', sans-serif",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {header}
      {error ? (
        <div
          style={{
            padding: "6px 24px",
            background: "rgba(255,0,204,0.08)",
            borderBottom: "1px solid rgba(255,0,204,0.25)",
          }}
        >
          <span style={{ fontSize: 12, color: "#ff00cc", fontWeight: 600 }}>{error}</span>
        </div>
      ) : null}
      {board}
      {logPanel}
      {prompt?.kind === "choose-color" ? <ColorPicker onPick={chooseColor} /> : null}
      {prompt?.kind === "vault-choice" && prompt.offers ? (
        <VaultPicker offers={prompt.offers} onPick={chooseVault} />
      ) : null}
      {prompt?.kind === "pick-players" ? (
        <TargetPicker
          players={opponents
            .map((player) => ({ id: player.id, name: player.name }))
            .concat(
              prompt.allowSelf
                ? [
                    {
                      id: identity.id,
                      name: view.players.find((p) => p.id === identity.id)?.name ?? "You",
                    },
                  ]
                : [],
            )}
          min={prompt.min}
          max={prompt.max}
          onConfirm={chooseTargets}
        />
      ) : null}
    </div>
  );
}
