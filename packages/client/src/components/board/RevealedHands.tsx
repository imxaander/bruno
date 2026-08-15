import { useState } from "react";
import type { PublicPlayer, RevealedHand } from "@bruno/shared";
import GameCard from "../GameCard.js";

interface RevealedHandsProps {
  revealed: RevealedHand[];
  players: PublicPlayer[];
}

export function RevealedHands({ revealed, players }: RevealedHandsProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  if (revealed.length === 0) {
    return null;
  }

  const toggle = (playerId: string) => {
    setCollapsed((previous) => {
      const next = new Set(previous);
      if (next.has(playerId)) {
        next.delete(playerId);
      } else {
        next.add(playerId);
      }
      return next;
    });
  };

  return (
    <div
      style={{
        position: "fixed",
        left: 16,
        bottom: 16,
        zIndex: 40,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        maxWidth: 280,
        maxHeight: "calc((100vh - 160px) / var(--bruno-zoom))",
        overflowY: "auto",
      }}
    >
      <span
        style={{
          fontFamily: "'Barlow Condensed'",
          fontWeight: 900,
          fontSize: 13,
          letterSpacing: "0.18em",
          color: "#00eeff",
          textShadow: "0 0 12px rgba(0,238,255,0.5)",
        }}
      >
        {"\uD83D\uDC41"} REVEALED HANDS
      </span>
      {revealed.map((hand) => {
        const player = players.find((p) => p.id === hand.playerId);
        const isCollapsed = collapsed.has(hand.playerId);
        return (
          <div
            key={hand.playerId}
            style={{
              background: "rgba(11,11,18,0.94)",
              border: "1px solid rgba(0,238,255,0.22)",
              borderRadius: 10,
              padding: "8px 10px",
              boxShadow: "0 0 24px rgba(0,238,255,0.08)",
            }}
          >
            <button
              onClick={() => toggle(hand.playerId)}
              style={{
                width: "100%",
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "'Rajdhani'",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: "#00eeff",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                {isCollapsed ? "\u25B6 " : "\u25BC "}
                {player?.name ?? hand.playerId}
              </span>
              <span style={{ fontSize: 11, color: "rgba(200,216,240,0.4)", fontWeight: 700 }}>
                {hand.cards.length} cards
              </span>
            </button>
            {!isCollapsed ? (
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  marginTop: 8,
                  flexWrap: "wrap",
                }}
              >
                {hand.cards.map((card) => (
                  <GameCard key={card.id} card={card} size="xs" />
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
