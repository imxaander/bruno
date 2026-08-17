import type { GameEndedPlayer } from "@bruno/shared";
import { Button } from "../components/Button.js";
import GameCard from "../components/GameCard.js";
import { PageHeader } from "../components/PageHeader.js";

interface AfterGameProps {
  winner: { id: string; name: string } | null;
  players: GameEndedPlayer[];
  reason: "hand_emptied" | "stalemate";
  goHome: () => void;
  goRooms: () => void;
}

const STAT_ROWS = [
  { label: "Win Streak", value: "—", unit: "in a row", color: "#00eeff" },
  { label: "Best Streak", value: "—", unit: "personal best", color: "#ffcc00" },
  { label: "Cards Played", value: "—", unit: "this game", color: "rgba(200,216,240,0.6)" },
  { label: "Vault Used", value: "—", unit: "powers played", color: "#ff00cc" },
];

function StarField() {
  const stars = Array.from({ length: 60 }, (_, i) => ({
    x: (i * 137.5) % 100,
    y: (i * 73.3) % 100,
    size: 1 + (i % 3) * 0.8,
    opacity: 0.1 + (i % 5) * 0.06,
    delay: (i % 7) * 0.4,
  }));
  return (
    <svg
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    >
      {stars.map((s, i) => (
        <circle
          key={i}
          cx={`${s.x}%`}
          cy={`${s.y}%`}
          r={s.size}
          fill="#c8d8f0"
          opacity={s.opacity}
          style={{ animation: `neon-pulse ${2 + s.delay}s ease-in-out infinite ${s.delay}s` }}
        />
      ))}
      <circle
        cx="25%"
        cy="30%"
        r="120"
        fill="none"
        stroke="rgba(0,238,255,0.06)"
        strokeWidth="0.5"
      />
      <circle
        cx="75%"
        cy="70%"
        r="90"
        fill="none"
        stroke="rgba(255,0,204,0.06)"
        strokeWidth="0.5"
      />
    </svg>
  );
}

export function AfterGame({ winner, players, reason, goHome, goRooms }: AfterGameProps) {
  const sorted = [...players].sort((a, b) => a.handCount - b.handCount);
  const champion = winner?.name ?? "Draw";
  const championPlayer = winner ? (players.find((p) => p.id === winner.id) ?? null) : null;
  return (
    <div
      style={{
        width: "100%",
        minHeight: "var(--bruno-vh)",
        background: "radial-gradient(ellipse at 50% 0%, #0c1410 0%, #090910 45%, #070710 100%)",
        fontFamily: "'Rajdhani',sans-serif",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <StarField />
      <PageHeader label="Round Over" />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 48px",
          gap: 36,
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <svg width="56" height="52" viewBox="0 0 56 52" fill="none">
            <path
              d="M4 44 L8 20 L20 32 L28 8 L36 32 L48 20 L52 44 Z"
              fill="url(#crown-grad)"
              style={{ filter: "drop-shadow(0 0 12px rgba(255,200,0,0.8))" }}
            />
            <defs>
              <linearGradient
                id="crown-grad"
                x1="4"
                y1="8"
                x2="52"
                y2="44"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="#ffe566" />
                <stop offset="50%" stopColor="#ffd700" />
                <stop offset="100%" stopColor="#c08800" />
              </linearGradient>
            </defs>
            <circle
              cx="4"
              cy="44"
              r="4"
              fill="#ffcc00"
              style={{ filter: "drop-shadow(0 0 6px rgba(255,200,0,0.9))" }}
            />
            <circle
              cx="28"
              cy="8"
              r="4"
              fill="#ffcc00"
              style={{ filter: "drop-shadow(0 0 6px rgba(255,200,0,0.9))" }}
            />
            <circle
              cx="52"
              cy="44"
              r="4"
              fill="#ffcc00"
              style={{ filter: "drop-shadow(0 0 6px rgba(255,200,0,0.9))" }}
            />
            <rect
              x="2"
              y="44"
              width="52"
              height="6"
              rx="3"
              fill="#c08800"
              style={{ filter: "drop-shadow(0 0 4px rgba(255,200,0,0.6))" }}
            />
          </svg>

          <h1
            style={{
              fontFamily: "'Barlow Condensed'",
              fontWeight: 900,
              fontSize: "clamp(52px,6vw,80px)",
              color: "#ffcc00",
              textShadow: "0 0 32px rgba(255,200,0,0.75), 0 0 72px rgba(255,160,0,0.35)",
              letterSpacing: "0.07em",
              margin: 0,
              lineHeight: 0.9,
            }}
          >
            WINNER!
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              color: "rgba(200,216,240,0.45)",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            Round complete
          </p>
        </div>

        <div style={{ display: "flex", gap: 40, alignItems: "center" }}>
          <div
            style={{
              width: 200,
              padding: "28px 24px",
              background:
                "linear-gradient(145deg, rgba(255,200,0,0.1) 0%, rgba(11,11,18,0.97) 100%)",
              border: "2px solid rgba(255,200,0,0.35)",
              borderRadius: 16,
              boxShadow:
                "0 0 36px rgba(255,200,0,0.18), 0 0 72px rgba(255,160,0,0.08), 0 16px 48px rgba(0,0,0,0.8)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div style={{ position: "relative" }}>
              <div
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle at 35% 35%, rgba(0,238,255,0.5), rgba(0,238,255,0.15))",
                  border: "3px solid rgba(255,200,0,0.6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 0 20px rgba(255,200,0,0.4)",
                }}
              >
                <span
                  style={{
                    fontFamily: "'Barlow Condensed'",
                    fontWeight: 900,
                    fontSize: 30,
                    color: "#00eeff",
                  }}
                >
                  {championPlayer?.icon || "?"}
                </span>
              </div>
              <div
                style={{
                  position: "absolute",
                  inset: -6,
                  borderRadius: "50%",
                  border: "1px solid rgba(255,200,0,0.25)",
                  animation: "neon-pulse 2s ease-in-out infinite",
                }}
              />
            </div>
            <div style={{ textAlign: "center" }}>
              <p
                style={{
                  fontFamily: "'Barlow Condensed'",
                  fontWeight: 900,
                  fontSize: 24,
                  color: "#f0d8a0",
                  margin: 0,
                  letterSpacing: "0.06em",
                  textShadow: "0 0 12px rgba(255,200,0,0.4)",
                }}
              >
                {champion}
              </p>
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: 11,
                  color: "rgba(200,216,240,0.4)",
                  fontWeight: 600,
                  letterSpacing: "0.12em",
                }}
              >
                {reason === "hand_emptied"
                  ? "First to empty hand"
                  : reason === "stalemate"
                    ? "Deck exhausted — fewest cards wins"
                    : "Round complete"}
              </p>
              {championPlayer && championPlayer.pointsDelta !== 0 ? (
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: 16,
                    fontWeight: 700,
                    color: championPlayer.pointsDelta > 0 ? "#37e66a" : "#ff5d5d",
                    letterSpacing: "0.1em",
                  }}
                >
                  {championPlayer.pointsDelta > 0 ? "+" : ""}
                  {championPlayer.pointsDelta} pts
                  {championPlayer.rankName ? ` · ${championPlayer.rankName}` : ""}
                </p>
              ) : null}
            </div>
            <GameCard color="red" value="0" size="md" lifted />
            <span
              style={{ fontSize: 10, color: "rgba(200,216,240,0.35)", letterSpacing: "0.12em" }}
            >
              Final card played
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {STAT_ROWS.map((s) => (
              <div
                key={s.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "12px 20px",
                  background: "rgba(11,11,18,0.9)",
                  border: "1px solid rgba(0,238,255,0.08)",
                  borderRadius: 9,
                  minWidth: 280,
                }}
              >
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 11,
                      fontWeight: 700,
                      color: "rgba(200,216,240,0.42)",
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                    }}
                  >
                    {s.label}
                  </p>
                  <p style={{ margin: "1px 0 0", fontSize: 12, color: "rgba(200,216,240,0.35)" }}>
                    {s.unit}
                  </p>
                </div>
                <span
                  style={{
                    fontFamily: "'Barlow Condensed'",
                    fontWeight: 900,
                    fontSize: 34,
                    color: s.color,
                    textShadow: `0 0 12px ${s.color}66`,
                    lineHeight: 1,
                  }}
                >
                  {s.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {sorted.length > 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              padding: "14px 20px",
              background: "rgba(11,11,18,0.9)",
              border: "1px solid rgba(0,238,255,0.08)",
              borderRadius: 9,
              minWidth: 380,
            }}
          >
            <p
              style={{
                margin: "0 0 4px",
                fontSize: 10,
                fontWeight: 700,
                color: "rgba(0,238,255,0.4)",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
              }}
            >
              Final Hands
            </p>
            {sorted.map((player, rank) => (
              <div
                key={player.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "6px 10px",
                  borderRadius: 6,
                  background:
                    rank === 0 && winner?.id === player.id ? "rgba(255,200,0,0.07)" : "transparent",
                }}
              >
                <span style={{ fontSize: 12, color: "rgba(200,216,240,0.4)", width: 18 }}>
                  {rank + 1}
                </span>
                <span style={{ fontSize: 14, width: 20, textAlign: "center" }}>
                  {player.icon ?? ""}
                </span>
                <span
                  style={{
                    flex: 1,
                    fontSize: 13,
                    fontWeight: 600,
                    color: winner?.id === player.id ? "#ffcc00" : "#c8d8f0",
                    letterSpacing: "0.04em",
                  }}
                >
                  {player.name}
                  {winner?.id === player.id ? " · WIN" : ""}
                </span>
                <span style={{ fontSize: 12, color: "rgba(200,216,240,0.5)", fontWeight: 700 }}>
                  {player.handCount}
                </span>
                <span
                  style={{
                    width: 52,
                    textAlign: "right",
                    fontSize: 13,
                    fontWeight: 700,
                    color:
                      player.pointsDelta > 0
                        ? "#37e66a"
                        : player.pointsDelta < 0
                          ? "#ff5d5d"
                          : "rgba(200,216,240,0.3)",
                  }}
                >
                  {player.pointsDelta > 0
                    ? `+${player.pointsDelta}`
                    : player.pointsDelta < 0
                      ? `${player.pointsDelta}`
                      : "—"}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 14, marginTop: 4 }}>
          <Button variant="cta" size="lg" onClick={goRooms}>
            PLAY AGAIN
          </Button>
          <Button variant="ghost" size="lg" onClick={goHome}>
            LEAVE ROOM
          </Button>
        </div>
      </div>
    </div>
  );
}
