import type { CardView } from "@bruno/shared";
import GameCard from "../GameCard.js";

interface TableOvalProps {
  deckCount: number;
  pileTop: CardView | null;
  direction: 1 | -1;
  pendingDraw?: number;
}

export function TableOval({ deckCount, pileTop, direction, pendingDraw = 0 }: TableOvalProps) {
  const arcPath = direction === 1 ? "M 20 6 A 14 14 0 0 1 34 20" : "M 20 6 A 14 14 0 0 0 6 20";
  const arrowPoints = direction === 1 ? "34,15 38,22 30,22" : "6,15 2,22 10,22";

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 720,
        height: 200,
        borderRadius: "50%",
        background: "radial-gradient(ellipse at center, #0d0d1c 0%, #090914 100%)",
        border: "2px solid rgba(0,238,255,0.08)",
        boxShadow: "0 0 60px rgba(0,238,255,0.05) inset, 0 10px 50px rgba(0,0,0,0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 52,
        position: "relative",
      }}
    >
      {pendingDraw > 0 ? (
        <div
          style={{
            position: "absolute",
            bottom: 14,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            padding: "8px 22px",
            background: "rgba(255,120,0,0.1)",
            border: "1px solid rgba(255,150,0,0.4)",
            borderRadius: 999,
            boxShadow: "0 0 24px rgba(255,140,0,0.25), 0 0 60px rgba(255,120,0,0.12)",
            animation: "neon-pulse 1.4s ease-in-out infinite",
          }}
        >
          <span
            style={{
              fontFamily: "'Barlow Condensed'",
              fontWeight: 900,
              fontSize: 20,
              lineHeight: 1,
              color: "#ffaa00",
              textShadow: "0 0 10px rgba(255,170,0,0.8)",
              letterSpacing: "0.04em",
            }}
          >
            +{pendingDraw}
          </span>
          <span
            style={{
              fontSize: 8,
              fontWeight: 700,
              color: "rgba(255,190,80,0.7)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            Pending — draw or stack
          </span>
        </div>
      ) : null}

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}>
        <div style={{ position: "relative" }}>
          <GameCard
            faceDown
            size="lg"
            style={{ position: "absolute", top: -3, left: -2, opacity: 0.5 }}
          />
          <GameCard
            faceDown
            size="lg"
            style={{ position: "absolute", top: -1, left: -1, opacity: 0.7 }}
          />
          <GameCard faceDown size="lg" />
          <div
            style={{
              position: "absolute",
              top: -8,
              right: -8,
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: "#0b0b12",
              border: "1px solid rgba(0,238,255,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontFamily: "'Barlow Condensed'",
                fontWeight: 900,
                fontSize: 12,
                color: "#00eeff",
              }}
            >
              {deckCount}
            </span>
          </div>
        </div>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: "rgba(0,238,255,0.4)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          Deck
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <svg width="40" height="40" viewBox="0 0 40 40">
          <circle
            cx="20"
            cy="20"
            r="18"
            fill="none"
            stroke="rgba(0,238,255,0.15)"
            strokeWidth="1.5"
          />
          <path
            d={arcPath}
            fill="none"
            stroke="#00eeff"
            strokeWidth="2"
            strokeLinecap="round"
            style={{ filter: "drop-shadow(0 0 4px #00eeff)" }}
          />
          <polygon
            points={arrowPoints}
            fill="#00eeff"
            style={{ filter: "drop-shadow(0 0 4px #00eeff)" }}
          />
        </svg>
        <span style={{ fontSize: 9, color: "rgba(0,238,255,0.4)", letterSpacing: "0.1em" }}>
          {direction === 1 ? "CLOCKWISE" : "COUNTER"}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}>
        <div style={{ position: "relative" }}>
          {pileTop ? (
            <>
              <GameCard
                card={pileTop}
                size="lg"
                style={{ position: "absolute", top: 4, left: 4, opacity: 0.35 }}
              />
              <GameCard
                card={pileTop}
                size="lg"
                style={{
                  boxShadow:
                    "0 0 52px rgba(0,110,255,1), 0 0 100px rgba(0,110,255,0.6), 0 0 160px rgba(0,110,255,0.22), 0 8px 24px rgba(0,0,0,0.9)",
                }}
              />
            </>
          ) : (
            <GameCard faceDown size="lg" />
          )}
        </div>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: "rgba(200,216,240,0.4)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          Pile
        </span>
      </div>
    </div>
  );
}
