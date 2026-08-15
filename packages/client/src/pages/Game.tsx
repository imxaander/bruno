import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import type {
  ErrorEnvelope,
  GameEffect,
  GameEndedPayload,
  GamePrompt,
  PlayerView,
  VaultGuideEntry,
} from "@bruno/shared";
import { getCard, getMayhemEvent } from "@bruno/shared";
import { Button } from "../components/Button.js";
import GameCard from "../components/GameCard.js";
import { Seat } from "../components/Seat.js";
import { TurnTimer } from "../components/TurnTimer.js";
import { TurnIndicator } from "../components/TurnIndicator.js";
import { EventHistory } from "../components/EventHistory.js";
import { TableStatus } from "../components/TableStatus.js";
import { PlayerHand } from "../components/board/PlayerHand.js";
import { RevealedHands } from "../components/board/RevealedHands.js";
import { TableOval } from "../components/board/TableOval.js";
import DrawFly, { type DrawFlyTarget } from "../components/board/DrawFly.js";
import EffectBanner from "../components/EffectBanner.js";
import GameAlert from "../components/GameAlert.js";
import { VAULT_ICONS } from "../components/vaultIcons.js";
import {
  CardPicker,
  ColorPicker,
  TargetPicker,
  VaultPicker,
  VaultGuide,
  LocationReveal,
  getLocationTheme,
  MayhemEventReveal,
  MayhemReveal,
  type CardColorName,
  type LocationTheme,
} from "../components/modals.js";
import type { BrunoSocket } from "../socket/client.js";
import type { PlayerIdentity } from "../socket/useSocket.js";

interface GameProps {
  socket: BrunoSocket | null;
  identity: PlayerIdentity;
  roomId: string | null;
  goLobby: () => void;
  onEnded: (payload: GameEndedPayload) => void;
  reconnecting?: boolean;
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

export function Game({ socket, identity, roomId, goLobby, onEnded, reconnecting }: GameProps) {
  const [view, setView] = useState<PlayerView | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [alert, setAlert] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<GamePrompt | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [effect, setEffect] = useState<GameEffect | null>(null);
  const [effectVisible, setEffectVisible] = useState(true);
  const [showEffectReveal, setShowEffectReveal] = useState(false);
  const [locationRevealData, setLocationRevealData] = useState<{
    id: string;
    name: string;
    effect: string;
    theme: LocationTheme;
  } | null>(null);
  const [revealedLocationId, setRevealedLocationId] = useState<string | null>(null);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [mayhemRevealData, setMayhemRevealData] = useState<{
    id: string;
    name: string;
    effect: string;
  } | null>(null);
  const [revealedMayhemId, setRevealedMayhemId] = useState<string | null>(null);
  const [mayhemModalOpen, setMayhemModalOpen] = useState(false);
  const [vaultGuideOpen, setVaultGuideOpen] = useState(false);
  const [vaultCatalog, setVaultCatalog] = useState<VaultGuideEntry[] | null>(null);
  const effectTimer = useRef<number[]>([]);
  const [drawTargets, setDrawTargets] = useState<DrawFlyTarget[]>([]);
  const drawTimer = useRef<number | null>(null);
  const locationModalTimer = useRef<number | null>(null);
  const mayhemModalTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      effectTimer.current.forEach(window.clearTimeout);
      if (drawTimer.current) {
        window.clearTimeout(drawTimer.current);
      }
      if (locationModalTimer.current) {
        window.clearTimeout(locationModalTimer.current);
      }
      if (mayhemModalTimer.current) {
        window.clearTimeout(mayhemModalTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!socket) {
      return;
    }
    const onState = (state: PlayerView) => setView(state);
    const onLog = (payload: { gameId: string; message: string }) =>
      setLog((prev) => [payload.message, ...prev].slice(0, 50));
    const onTurn = (payload: { gameId: string; playerIndex: number; playerId: string }) => {
      if (payload.gameId !== roomId) {
        return;
      }
      setView((prev) => (prev ? { ...prev, currentTurnIndex: payload.playerIndex } : prev));
      // Do NOT clear prompts here — the server manages prompts explicitly via game:prompt.
      // Clearing on turn changes was killing the +4 color picker (turn advances to next
      // player while the +4 player still has a pending choose-color prompt).
    };
    const onError = (payload: ErrorEnvelope) => {
      setError(payload.message);
      // Clear any open prompt when an error arrives — the server rejected the
      // action, so the client-side prompt is stale and should be dismissed.
      setPrompt(null);
    };
    const onPrompt = (payload: GamePrompt) => {
      if (payload.gameId === roomId) {
        setPrompt(payload);
      }
    };
    const onAlert = (payload: { gameId: string; message: string }) => {
      if (payload.gameId === roomId) {
        setAlert(payload.message);
      }
    };
    const onEndedEvent = (payload: GameEndedPayload) => {
      if (payload.gameId === roomId) {
        setPrompt(null);
        onEnded(payload);
      }
    };
    const onEffect = (payload: GameEffect) => {
      if (payload.gameId === roomId) {
        setEffect(payload);
        setShowEffectReveal(true);
        setEffectVisible(true);
        setLog((prev) =>
          [
            `${VAULT_ICONS[payload.cardId] ?? ""} ${payload.playerName} activated ${payload.name}`,
            ...prev,
          ].slice(0, 50),
        );
        effectTimer.current.forEach(window.clearTimeout);
        effectTimer.current = [
          window.setTimeout(() => {
            setEffectVisible(false);
            setShowEffectReveal(false);
          }, 5000),
          window.setTimeout(() => setEffect(null), 5150),
        ];
      }
    };
    const onDraw = (payload: {
      gameId: string;
      playerId: string;
      playerName: string;
      count: number;
    }) => {
      if (payload.gameId !== roomId) {
        return;
      }
      setDrawTargets((prev) => {
        const next = [
          ...prev.filter((target) => target.playerId !== payload.playerId),
          { playerId: payload.playerId, playerName: payload.playerName, count: payload.count },
        ];
        const totalCards = next.reduce((sum, target) => sum + target.count, 0);
        if (drawTimer.current) {
          window.clearTimeout(drawTimer.current);
        }
        drawTimer.current = window.setTimeout(() => setDrawTargets([]), totalCards * 120 + 900);
        return next;
      });
    };
    const onCatalog = (payload: { implemented: VaultGuideEntry[] }) =>
      setVaultCatalog(payload.implemented);
    socket.on("game:state", onState);
    socket.on("game:log", onLog);
    socket.on("game:draw", onDraw);
    socket.on("game:turn", onTurn);
    socket.on("error", onError);
    socket.on("game:prompt", onPrompt);
    socket.on("game:alert", onAlert);
    socket.on("game:ended", onEndedEvent);
    socket.on("game:effect", onEffect);
    socket.on("vault:catalog:return", onCatalog);
    if (roomId && identity.id) {
      socket.emit("game:state:get", { gameId: roomId, playerId: identity.id });
    }
    return () => {
      socket.off("game:state", onState);
      socket.off("game:log", onLog);
      socket.off("game:draw", onDraw);
      socket.off("game:turn", onTurn);
      socket.off("error", onError);
      socket.off("game:prompt", onPrompt);
      socket.off("game:alert", onAlert);
      socket.off("game:ended", onEndedEvent);
      socket.off("game:effect", onEffect);
      socket.off("vault:catalog:return", onCatalog);
    };
  }, [socket, roomId, identity.id, onEnded]);

  useEffect(() => {
    if (!view?.locationId || view.locationId === revealedLocationId) {
      return;
    }
    const card = getCard(view.locationId);
    if (!card || card.type !== "location") {
      return;
    }
    const theme = getLocationTheme(view.locationId);
    const message = `Location: ${card.name} — ${card.effect}`;
    setLocationRevealData({
      id: view.locationId,
      name: card.name,
      effect: card.effect,
      theme,
    });
    setLocationModalOpen(true);
    setRevealedLocationId(view.locationId);
    setLog((prev) =>
      prev.some((line) => line === message) ? prev : [message, ...prev].slice(0, 50),
    );

    if (locationModalTimer.current) {
      window.clearTimeout(locationModalTimer.current);
    }
    locationModalTimer.current = window.setTimeout(() => {
      setLocationModalOpen(false);
      locationModalTimer.current = null;
    }, 5000);
  }, [view?.locationId, revealedLocationId]);

  useEffect(() => {
    if (view?.locationId !== "loc-hell-gate") {
      return;
    }
    if (!view?.mayhemEventId || view.mayhemEventId === revealedMayhemId) {
      return;
    }
    const event = getMayhemEvent(view.mayhemEventId);
    if (!event) {
      return;
    }
    setMayhemRevealData({ id: view.mayhemEventId, name: event.name, effect: event.effect });
    setMayhemModalOpen(true);
    setRevealedMayhemId(view.mayhemEventId);

    if (mayhemModalTimer.current) {
      window.clearTimeout(mayhemModalTimer.current);
    }
    mayhemModalTimer.current = window.setTimeout(() => {
      setMayhemModalOpen(false);
      mayhemModalTimer.current = null;
    }, 5000);
  }, [view?.mayhemEventId, revealedMayhemId]);

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
      setPrompt(null);
      socket?.emit("game:action", {
        gameId: roomId,
        type: "choose-color",
        playerId: identity.id,
        chosenColor: color,
      });
    },
    [socket, roomId, identity.id],
  );

  const chooseVault = useCallback(
    (cardId: string) => {
      if (!roomId || !identity.id) {
        return;
      }
      setPrompt(null);
      socket?.emit("game:action", {
        gameId: roomId,
        type: "vault-choice",
        playerId: identity.id,
        cardId,
      });
    },
    [socket, roomId, identity.id],
  );

  const chooseTargets = useCallback(
    (targetIds: string[]) => {
      if (!roomId || !identity.id) {
        return;
      }
      setPrompt(null);
      socket?.emit("game:action", {
        gameId: roomId,
        type: "choose-targets",
        playerId: identity.id,
        targetIds,
      });
    },
    [socket, roomId, identity.id],
  );

  const chooseCards = useCallback(
    (cardIds: string[]) => {
      if (!roomId || !identity.id) {
        return;
      }
      setPrompt(null);
      socket?.emit("game:action", {
        gameId: roomId,
        type: "choose-cards",
        playerId: identity.id,
        cardIds,
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

  const investmentDraw = useCallback(() => {
    if (!roomId || !identity.id) {
      return;
    }
    socket?.emit("game:action", {
      gameId: roomId,
      type: "investment-draw",
      playerId: identity.id,
    });
  }, [socket, roomId, identity.id]);

  const leaveGame = useCallback(() => {
    if (roomId && identity.id) {
      socket?.emit("lobby:leave", { gameId: roomId, playerId: identity.id });
    }
    goLobby();
  }, [socket, roomId, identity.id, goLobby]);

  const turnDuration = view?.turnDuration ?? 7;
  const myTurn = view ? view.currentTurnIndex === view.you.index : false;
  const canDraw = view != null && myTurn && !prompt;

  const turnPlayerName = view ? view.players[view.currentTurnIndex]?.name : undefined;

  useEffect(() => {
    if (view?.turnDeadline) {
      setRemaining(Math.max(0, Math.ceil((view.turnDeadline - Date.now()) / 1000)));
    } else {
      setRemaining(turnDuration);
    }
  }, [turnDuration, view?.currentTurnIndex, prompt, view?.turnDeadline]);

  useEffect(() => {
    const deadline = view?.turnDeadline;
    if (!deadline) {
      return;
    }
    const id = window.setInterval(() => {
      setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    }, 250);
    return () => window.clearInterval(id);
  }, [view?.turnDeadline, view?.currentTurnIndex]);

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

  const theme = locationRevealData?.theme;
  const pageBackground = theme
    ? `${theme.page}, ${theme.background}`
    : "radial-gradient(ellipse at 50% 40%, #0c0c1a 0%, #080810 60%, #060610 100%)";

  const header = (
    <div
      style={{
        height: 52,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
        gap: 16,
        background: theme ? "rgba(5,8,14,0.94)" : "rgba(7,7,12,0.98)",
        borderBottom: theme ? `1px solid ${theme.accent}` : "1px solid rgba(0,238,255,0.07)",
        boxShadow: theme ? `0 0 40px ${theme.soft}` : undefined,
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
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 8 }}>
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
        onClick={() => {
          if (!vaultCatalog && socket) {
            socket.emit("vault:catalog:get");
          }
          setVaultGuideOpen(true);
        }}
        style={{
          padding: "5px 14px",
          fontFamily: "'Rajdhani'",
          fontWeight: 600,
          fontSize: 12,
          background: "transparent",
          color: "rgba(0,238,255,0.7)",
          border: "1px solid rgba(0,238,255,0.3)",
          borderRadius: 5,
          cursor: "pointer",
          letterSpacing: "0.08em",
        }}
      >
        VAULTS
      </button>
      <button
        onClick={leaveGame}
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

  const promptAction =
    prompt?.kind === "choose-color"
      ? "Choose a color"
      : prompt?.kind === "vault-choice"
        ? "Pick an effect"
        : prompt?.kind === "pick-players"
          ? "Pick targets"
          : prompt?.kind === "pick-cards"
            ? "Pick cards"
            : undefined;

  const timerControls = (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <TurnTimer
        seconds={Math.ceil(remaining)}
        active={myTurn}
        total={turnDuration}
        action={promptAction}
        playerName={turnPlayerName}
      />
      {myTurn ? (
        <>
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
          {view.investmentOffer ? (
            <Button
              variant="outline"
              size="sm"
              onClick={investmentDraw}
              style={{
                color: "#00e676",
                borderColor: "rgba(0,230,118,0.35)",
                padding: "8px 18px",
                fontSize: 13,
                boxShadow: "0 0 10px rgba(0,230,118,0.15)",
                cursor: "pointer",
              }}
            >
              DRAW +1 (Investment)
            </Button>
          ) : null}
        </>
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

  const board = isRing ? (
    <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
      <TurnIndicator myTurn={myTurn} />
      <div
        style={{
          position: "absolute",
          top: "14%",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 30,
          pointerEvents: "none",
        }}
      >
        <TableStatus
          activeColor={view.activeColor}
          pendingDraw={view.pendingDraw}
          myTurn={myTurn}
        />
      </div>
      {opponents.map((player, i) => (
        <div
          key={player.id}
          data-player-seat={player.id}
          style={{ position: "absolute", zIndex: 2, ...SEATS_8P[i] }}
        >
          <Seat
            player={player}
            compact
            rankIcon={player.rankIcon}
            rankName={player.rankName}
            profileIcon={player.profileIcon}
          />
        </div>
      ))}

      <div
        style={{
          position: "absolute",
          top: "36%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 1,
          width: "64%",
        }}
      >
        <TableOval
          deckCount={view.deckCount}
          pileTop={view.pileTop}
          pileEffect={view.pileEffect}
          fleetingPileTop={view.fleetingPileTop}
          direction={view.currentDirection}
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
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 2,
        }}
      >
        <div data-player-hand={identity.id}>
          <PlayerHand
            hand={view.you.hand}
            playable={view.you.playable}
            myTurn={myTurn}
            onPlay={playCard}
            badge={meLabel}
          />
        </div>
      </div>
    </div>
  ) : (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <TurnIndicator myTurn={myTurn} />
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
          <div key={player.id} data-player-seat={player.id}>
            <Seat
              player={player}
              rankIcon={player.rankIcon}
              rankName={player.rankName}
              profileIcon={player.profileIcon}
            />
          </div>
        ))}
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 60px",
          paddingLeft: 300,
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "12%",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 30,
            pointerEvents: "none",
          }}
        >
          <TableStatus
            activeColor={view.activeColor}
            pendingDraw={view.pendingDraw}
            myTurn={myTurn}
          />
        </div>
        <TableOval
          deckCount={view.deckCount}
          pileTop={view.pileTop}
          pileEffect={view.pileEffect}
          fleetingPileTop={view.fleetingPileTop}
          direction={view.currentDirection}
        />
        <div style={{ position: "absolute", right: 60, top: "50%", transform: "translateY(-50%)" }}>
          {timerControls}
        </div>
      </div>
      <div style={{ flexShrink: 0 }}>
        <div data-player-hand={identity.id}>
          <PlayerHand
            hand={view.you.hand}
            playable={view.you.playable}
            myTurn={myTurn}
            onPlay={playCard}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        background: pageBackground,
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
      <EventHistory events={log} />
      {effect && !showEffectReveal ? (
        <EffectBanner effect={effect} visible={effectVisible} />
      ) : null}
      <GameAlert message={alert} onDismiss={() => setAlert(null)} />
      {locationModalOpen && locationRevealData ? (
        <LocationReveal
          name={locationRevealData.name}
          effect={locationRevealData.effect}
          theme={locationRevealData.theme}
          onDone={() => setLocationModalOpen(false)}
        />
      ) : null}
      {mayhemModalOpen && mayhemRevealData ? (
        <MayhemEventReveal
          name={mayhemRevealData.name}
          effect={mayhemRevealData.effect}
          onDone={() => setMayhemModalOpen(false)}
        />
      ) : null}
      {vaultGuideOpen && vaultCatalog ? (
        <VaultGuide entries={vaultCatalog} onClose={() => setVaultGuideOpen(false)} />
      ) : null}
      {showEffectReveal && effect ? (
        <MayhemReveal
          playerName={effect.playerName}
          cardValue={effect.name}
          icon={VAULT_ICONS[effect.cardId]}
          tier={
            effect.tier === "vault-silver"
              ? "silver"
              : effect.tier === "vault-gold"
                ? "gold"
                : "diamond"
          }
          powerName={effect.name}
          effectText={effect.text}
          target={
            effect.targetNames && effect.targetNames.length > 0
              ? effect.targetNames.join(", ")
              : "No explicit target"
          }
          resultText={
            effect.lines.length > 0
              ? effect.lines.map((line, index) => (
                  <span key={index}>
                    {line}
                    {index < effect.lines.length - 1 ? <br /> : null}
                  </span>
                ))
              : "No outcome details."
          }
          onDone={() => setShowEffectReveal(false)}
        />
      ) : null}
      {drawTargets.length > 0 ? (
        <DrawFly
          targets={drawTargets}
          playerOrder={view.players.map((player) => player.id)}
          myId={identity.id}
        />
      ) : null}
      {(view.revealed ?? []).length > 0 && prompt?.kind !== "pick-cards" ? (
        <RevealedHands revealed={view.revealed ?? []} players={view.players} />
      ) : null}
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
      {prompt?.kind === "pick-cards" ? (
        <CardPicker
          sources={
            prompt.selfHand
              ? [
                  {
                    playerId: identity.id,
                    playerName: "Your hand",
                    cards: (view?.you.hand ?? []).filter(
                      (card) => card.id !== prompt.excludedCardId,
                    ),
                  },
                ]
              : prompt.sourcePlayerIds
                  .map((sourceId) => {
                    const revealed = view.revealed?.find((hand) => hand.playerId === sourceId);
                    const publicPlayer = view.players.find((p) => p.id === sourceId);
                    return {
                      playerId: sourceId,
                      playerName: publicPlayer?.name ?? "Player",
                      cards: revealed?.cards ?? [],
                    };
                  })
                  .filter((source) => source.cards.length > 0)
          }
          min={prompt.min}
          max={prompt.max}
          perPlayer={prompt.perPlayer}
          selfHand={prompt.selfHand}
          onConfirm={chooseCards}
        />
      ) : null}
      {reconnecting ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(6,6,16,0.92)",
            backdropFilter: "blur(8px)",
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "#ffaa00",
              boxShadow: "0 0 16px rgba(255,170,0,0.8)",
              animation: "neon-pulse 1.5s ease-in-out infinite",
              marginBottom: 16,
            }}
          />
          <p
            style={{
              fontFamily: "'Barlow Condensed'",
              fontWeight: 800,
              fontSize: 22,
              color: "#e8f0ff",
              letterSpacing: "0.1em",
              margin: 0,
            }}
          >
            RECONNECTING
          </p>
          <p
            style={{
              fontFamily: "'Rajdhani'",
              fontSize: 14,
              color: "rgba(200,216,240,0.5)",
              margin: "8px 0 0",
              letterSpacing: "0.06em",
            }}
          >
            Your seat is held. Rejoining…
          </p>
        </div>
      ) : null}
    </div>
  );
}
