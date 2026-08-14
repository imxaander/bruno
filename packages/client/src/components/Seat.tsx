import type { PublicPlayer } from "@bruno/shared";
import GameCard from "./GameCard.js";

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

interface SeatProps {
  player: PublicPlayer;
  self?: boolean;
  compact?: boolean;
  showSeat?: boolean;
  rankIcon?: string;
  rankName?: string;
}

export function Seat({
  player,
  self = false,
  compact = false,
  showSeat = false,
  rankIcon,
  rankName,
}: SeatProps) {
  const avatarColor = hashColor(player.id);
  const active = player.isTurn;
  const avatarSize = compact ? 36 : 44;
  const fanCount = Math.min(player.handCount, 5);

  const classes = [
    "seat",
    active ? "seat-active" : "",
    self ? "seat-self" : "",
    compact ? "seat-compact" : "",
  ]
    .join(" ")
    .trim();

  return (
    <div className={classes}>
      <div style={{ position: "relative" }}>
        <div
          className="seat-avatar"
          style={{
            width: avatarSize,
            height: avatarSize,
            background: `radial-gradient(circle at 35% 35%, ${avatarColor}44, ${avatarColor}18)`,
            border: `2px solid ${active ? avatarColor : `${avatarColor}44`}`,
            boxShadow: active ? `0 0 8px ${avatarColor}44` : "none",
          }}
        >
          <span style={{ fontSize: Math.round(avatarSize * 0.42), color: avatarColor }}>
            {player.name.charAt(0).toUpperCase()}
          </span>
        </div>
        {rankIcon ? (
          <span
            title={rankName ?? undefined}
            style={{
              position: "absolute",
              bottom: -4,
              right: -4,
              fontSize: 12,
              background: "rgba(8,8,14,0.85)",
              borderRadius: "50%",
              width: 18,
              height: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {rankIcon}
          </span>
        ) : null}
        {active ? <span className="seat-active-ring" /> : null}
      </div>
      <span className={`seat-name${active ? " seat-name-active" : ""}`}>{player.name}</span>
      <div className="seat-fan" style={{ width: compact ? 58 : 72, height: compact ? 38 : 44 }}>
        {Array.from({ length: fanCount }).map((_, i, arr) => {
          const angle = (i - (arr.length - 1) / 2) * 9;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                transform: `translateX(${(i - (arr.length - 1) / 2) * (compact ? 5 : 6)}px) rotate(${angle}deg)`,
                transformOrigin: "center bottom",
              }}
            >
              <GameCard faceDown size="xs" />
            </div>
          );
        })}
      </div>
      <div className="seat-count-row">
        <span className={`seat-count${active ? " seat-count-active" : ""}`}>
          {player.handCount}
        </span>
        <span className="seat-count-label">cards</span>
      </div>
    </div>
  );
}
