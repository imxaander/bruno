import type { CSSProperties } from "react";
import type { CardView } from "@bruno/shared";
import GameCard from "../GameCard.js";

interface PlayerHandProps {
  hand: CardView[];
  playable: boolean[];
  myTurn: boolean;
  onPlay: (index: number) => void;
}

export function PlayerHand({ hand, playable, myTurn, onPlay }: PlayerHandProps) {
  const CARD_W = 76;
  const CARD_H = 108;
  const n = hand.length;
  const centerIdx = (n - 1) / 2;

  return (
    <div
      style={{
        height: 204,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-end",
        paddingBottom: 16,
      }}
    >
      <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#aaff00",
            boxShadow: "0 0 8px rgba(170,255,0,0.8)",
          }}
        />
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "rgba(170,255,0,0.7)",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}
        >
          Your Hand
        </span>
        <span style={{ fontSize: 11, color: "rgba(200,216,240,0.3)", fontWeight: 600 }}>
          ({n} cards)
        </span>
      </div>
      <div
        style={{
          position: "relative",
          width: 600,
          height: 140,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
        }}
      >
        {hand.map((card, i) => {
          const canPlay = myTurn && playable[i] === true;
          const angle = ((i - centerIdx) / Math.max(centerIdx, 1)) * 20;
          const xOffset = (i - centerIdx) * 62;
          const yLift = canPlay ? -14 : 0;
          const zIndex =
            i === Math.round(centerIdx) ? 10 : 10 - Math.abs(i - Math.round(centerIdx));
          return (
            <button
              key={card.id}
              disabled={!canPlay}
              onClick={() => onPlay(i)}
              style={
                {
                  position: "absolute",
                  bottom: 0,
                  left: "50%",
                  marginLeft: -(CARD_W / 2),
                  padding: 0,
                  background: "none",
                  border: "none",
                  cursor: canPlay ? "pointer" : "default",
                  transform: `translateX(${xOffset}px) translateY(${yLift}px) rotate(${angle}deg)`,
                  transformOrigin: `${CARD_W / 2}px ${CARD_H + 160}px`,
                  zIndex,
                  transition: "transform 0.16s ease",
                } as CSSProperties
              }
            >
              <GameCard card={card} size="md" lifted={canPlay} dimmed={!canPlay} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
