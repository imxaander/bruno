import { useEffect, useState } from "react";
import type { ErrorEnvelope, LobbyPlayer } from "@bruno/shared";
import { RoleBadge, type RoleType } from "../components/Badge.js";
import { Button } from "../components/Button.js";
import { PageHeader } from "../components/PageHeader.js";
import type { BrunoSocket } from "../socket/client.js";
import type { PlayerIdentity } from "../socket/useSocket.js";

interface LobbyProps {
  socket: BrunoSocket | null;
  identity: PlayerIdentity;
  roomId: string | null;
  roomName: string;
  maxPlayers: number;
  goRooms: () => void;
  goGame: (gameId: string) => void;
}

const SEAT_COUNT = 8;

const AVATAR_COLORS = [
  "#ff00cc",
  "#00eeff",
  "#aaff00",
  "#ffaa00",
  "#ff3355",
  "#8855ff",
  "#ff6620",
  "#00e676",
];

function hashColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length] ?? "#00eeff";
}

interface SeatCardProps {
  name: string | null;
  role: RoleType | null;
  avatarColor: string;
  index: number;
}

function SeatCard({ name, role, avatarColor, index }: SeatCardProps) {
  if (!name) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          padding: "22px 18px",
          background: "rgba(10,10,18,0.82)",
          border: "1px dashed rgba(0,238,255,0.28)",
          borderRadius: 12,
          minWidth: 0,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            border: "1px dashed rgba(0,238,255,0.32)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,238,255,0.03)",
          }}
        >
          <span style={{ fontSize: 22, color: "rgba(0,238,255,0.45)", lineHeight: 1 }}>+</span>
        </div>
        <span
          style={{
            fontSize: 11,
            color: "rgba(200,216,240,0.52)",
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          Seat {index + 1}
        </span>
        <span
          style={{
            fontSize: 10,
            color: "rgba(0,238,255,0.3)",
            letterSpacing: "0.1em",
            fontWeight: 500,
          }}
        >
          Waiting...
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        padding: "22px 18px",
        background: "rgba(11,11,18,0.94)",
        border: "1px solid rgba(0,238,255,0.1)",
        borderRadius: 12,
        minWidth: 0,
        transition: "border-color 0.15s",
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: `radial-gradient(circle at 35% 35%, ${avatarColor}44, ${avatarColor}22)`,
          border: `2px solid ${avatarColor}55`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 0 12px ${avatarColor}30`,
        }}
      >
        <span
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 900,
            fontSize: 18,
            color: avatarColor,
          }}
        >
          {name.charAt(0).toUpperCase()}
        </span>
      </div>
      <span
        style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 700,
          fontSize: 16,
          color: "#d4e4f8",
          letterSpacing: "0.06em",
        }}
      >
        {name}
      </span>
      {role ? <RoleBadge role={role} /> : null}
    </div>
  );
}

const RULES_STRIP = [
  { icon: "\uD83C\uDC82", label: "Deck", value: "Standard + Vault" },
  { icon: "\u26A1", label: "Powers", value: "Enabled" },
  { icon: "\u23F1", label: "Timer", value: "5 sec / turn" },
  { icon: "\uD83C\uDFAF", label: "Mode", value: "Last card wins" },
];

export function Lobby({
  socket,
  identity,
  roomId,
  roomName,
  maxPlayers,
  goRooms,
  goGame,
}: LobbyProps) {
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
    if (roomId && identity.id) {
      socket.emit("lobby:join", {
        gameId: roomId,
        playerId: identity.id,
        playerName: identity.name,
      });
    }
    return () => {
      socket.off("lobby:update", onUpdate);
      socket.off("game:start:return", onStart);
      socket.off("error", onError);
    };
  }, [socket, roomId, identity.id, identity.name, goGame]);

  const me = players.find((player) => player.id === identity.id);
  const seats: Array<{ name: string | null; role: RoleType | null; avatarColor: string }> =
    Array.from({ length: SEAT_COUNT }, (_, index) => {
      const player = players[index];
      return player
        ? {
            name: player.name,
            role: player.isHost ? "host" : "member",
            avatarColor: hashColor(player.id),
          }
        : { name: null, role: null, avatarColor: "" };
    });

  const leave = () => {
    if (roomId && identity.id) {
      socket?.emit("lobby:leave", { gameId: roomId, playerId: identity.id });
    }
    goRooms();
  };

  const start = () => {
    if (roomId && identity.id) {
      socket?.emit("game:start", { gameId: roomId, playerId: identity.id });
    }
  };

  const host = players.find((player) => player.isHost);

  // Localhost dev allows solo games; deployed builds need at least 3 players to start.
  const isLocalhost = ["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(
    window.location.hostname,
  );
  const minStartPlayers = isLocalhost ? 1 : 3;
  const canStart = players.length >= minStartPlayers;

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        background: "linear-gradient(160deg,#0a0a14 0%,#080810 60%,#080810 100%)",
        fontFamily: "'Rajdhani',sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <PageHeader label="Lobby" />

      {error ? (
        <div
          style={{
            padding: "6px 28px",
            background: "rgba(255,0,204,0.08)",
            borderBottom: "1px solid rgba(255,0,204,0.25)",
          }}
        >
          <span style={{ fontSize: 12, color: "#ff00cc", fontWeight: 600 }}>{error}</span>
        </div>
      ) : null}

      <div
        style={{ flex: 1, display: "flex", flexDirection: "column", padding: "32px 60px", gap: 28 }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2
              style={{
                fontFamily: "'Barlow Condensed'",
                fontWeight: 900,
                fontSize: 36,
                color: "#00eeff",
                margin: 0,
                textShadow: "0 0 20px rgba(0,238,255,0.5)",
                letterSpacing: "0.06em",
              }}
            >
              {roomName}
            </h2>
            <p
              style={{
                margin: "6px 0 0",
                fontSize: 13,
                color: "rgba(200,216,240,0.42)",
                letterSpacing: "0.1em",
              }}
            >
              {players.length} / {maxPlayers} players &nbsp;·&nbsp; Hosted by {host?.name ?? "—"}{" "}
              &nbsp;·&nbsp;
              <span style={{ color: "rgba(0,230,118,0.7)" }}>Waiting to start</span>
              {!isLocalhost && players.length < minStartPlayers ? (
                <span style={{ color: "rgba(255,60,80,0.75)", marginLeft: 6 }}>
                  · Need at least {minStartPlayers} players
                </span>
              ) : null}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Button
              variant="ghost"
              size="sm"
              style={{ color: "rgba(255,60,80,0.75)", borderColor: "rgba(255,60,80,0.3)" }}
              onClick={leave}
            >
              Leave
            </Button>
            {me?.isHost ? (
              <Button
                variant="cta"
                size="md"
                style={{ padding: "10px 28px", fontSize: 17 }}
                onClick={() => {
                  if (canStart) {
                    start();
                  }
                }}
              >
                {canStart ? "START GAME" : `NEED ${minStartPlayers}+`}
              </Button>
            ) : null}
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
            {seats.slice(0, 4).map((seat, i) => (
              <SeatCard
                key={i}
                name={seat.name}
                role={seat.role}
                avatarColor={seat.avatarColor}
                index={i}
              />
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
            {seats.slice(4, 8).map((seat, i) => (
              <SeatCard
                key={i + 4}
                name={seat.name}
                role={seat.role}
                avatarColor={seat.avatarColor}
                index={i + 4}
              />
            ))}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 24,
            padding: "14px 20px",
            background: "rgba(0,238,255,0.025)",
            border: "1px solid rgba(0,238,255,0.07)",
            borderRadius: 8,
          }}
        >
          {RULES_STRIP.map((r) => (
            <div key={r.label} style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ fontSize: 20 }}>{r.icon}</span>
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 10,
                    color: "rgba(0,238,255,0.45)",
                    fontWeight: 700,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                  }}
                >
                  {r.label}
                </p>
                <p style={{ margin: 0, fontSize: 13, color: "#c8d8f0", fontWeight: 600 }}>
                  {r.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
